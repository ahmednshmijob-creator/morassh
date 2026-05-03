'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useUser';
import {
  Smartphone,
  Palette,
  Globe,
  ArrowRight,
  Bot,
  Utensils,
  Loader2,
  UploadCloud,
  X,
  PlusCircle,
  Check,
  Layout,
  Link as LinkIcon,
  AppWindow,
  Sparkles,
  ImageIcon,
} from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { supabase } from '@/lib/supabase';
import { syncPublicPage } from '@/lib/public-pages';
import { StorageImage } from '@/components/shared/StorageImage';
import { InstagramIcon, XIcon, TikTokIcon, SnapchatIcon, YoutubeIcon, FacebookIcon, WhatsAppIcon, WebsiteIcon } from '@/components/shared/SocialIcons';
import PageHeader from '@/components/dashboard/PageHeader';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { extractColorsFromImage } from '@/lib/extract-colors-from-image';

const SOCIAL_PLATFORMS = [
  { label: 'واتساب', value: 'whatsapp', icon: WhatsAppIcon, color: '#25D366' },
  { label: 'انستقرام', value: 'instagram', icon: InstagramIcon, color: '#E4405F' },
  { label: 'تيك توك', value: 'tiktok', icon: TikTokIcon, color: '#000000' },
  { label: 'تويتر (X)', value: 'twitter', icon: XIcon, color: '#000000' },
  { label: 'سناب شات', value: 'snapchat', icon: SnapchatIcon, color: '#FFFC00' },
  { label: 'فيسبوك', value: 'facebook', icon: FacebookIcon, color: '#1877F2' },
  { label: 'يوتيوب', value: 'youtube', icon: YoutubeIcon, color: '#FF0000' },
  { label: 'موقع إلكتروني', value: 'website', icon: WebsiteIcon, color: '#714dfa' },
];

export default function CustomizePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [globalApps, setGlobalApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const [isSuggestingColors, setIsSuggestingColors] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [customAppFiles, setCustomAppFiles] = useState<Record<string, File>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const appLogoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const initialUsernameRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.restaurantId) {
        try {
            const { data: restData } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', user.restaurantId)
                .single();

            if (restData) {
              initialUsernameRef.current = restData.username ?? null;
              setSettings({
                ...restData,
                socialLinks: Array.isArray(restData.socialLinks) ? restData.socialLinks : [],
                applications: Array.isArray(restData.applications) ? restData.applications : [],
                borderRadius: restData.borderRadius ?? 16,
                fontFamily: restData.fontFamily ?? 'Cairo',
              });
              setLogoPreview(restData.logo);
            }
        } catch (serverError: any) {
            console.error("Error fetching restaurant data:", serverError);
        }

        try {
            const { data: appsData } = await supabase.from('applications').select('*');
            setGlobalApps(appsData || []);
        } catch (serverError: any) {
            console.error("Error fetching applications:", serverError);
        }

        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSuggestColors = async () => {
    let dataUri = '';

    try {
        if (logoFile) {
            dataUri = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(logoFile);
            });
        } else if (logoPreview) {
            let finalUrl = logoPreview;
            if (!logoPreview.startsWith('http') && !logoPreview.startsWith('blob:')) {
                const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(logoPreview);
                finalUrl = publicUrl;
            }
            const response = await fetch(finalUrl);
            const blob = await response.blob();
            dataUri = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        if (!dataUri) return;

        setIsSuggestingColors(true);
        const result = await extractColorsFromImage(dataUri);
        setSettings({
            ...settings,
            primaryColor: result.primaryColor,
            secondaryColor: result.secondaryColor,
            buttonTextColor: result.buttonTextColor
        });
        toast({ title: "تم استخراج الألوان من الشعار وتطبيقها على الواجهة!" });
    } catch (error: any) {
        toast({ title: "خطأ", description: error.message || "فشل تحليل الشعار.", variant: "destructive" });
    } finally {
        setIsSuggestingColors(false);
    }
  };

  const handleSave = async () => {
    if (!user?.restaurantId || isSaving) return;

    startSaving(async () => {
      try {
        let logoUrl = settings.logo;
        if (logoFile) {
          const path = `restaurants/${user.restaurantId}/logo`;
          const { data: uploadData, error: uploadError } = await supabase.storage
              .from('restaurant-assets')
              .upload(path, logoFile, { upsert: true });
          if (uploadError) throw uploadError;
          logoUrl = uploadData.path;
        }

        const updatedApplications = await Promise.all((settings.applications || []).map(async (app: any) => {
            if (app.type === 'custom' && customAppFiles[app.id]) {
                const file = customAppFiles[app.id];
                const path = `restaurants/${user.restaurantId}/custom_apps/${app.id}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('restaurant-assets')
                    .upload(path, file, { upsert: true });
                if (uploadError) throw uploadError;
                return { ...app, logo: uploadData.path };
            }
            return app;
        }));

        const { ...cleanSettings } = settings;
        const newUsername = (cleanSettings.username ?? '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
        if (!newUsername && initialUsernameRef.current) {
          toast({ title: 'خطأ', description: 'اسم المستخدم مطلوب للرابط النهائي.', variant: 'destructive' });
          return;
        }
        const usernameChanged = newUsername && newUsername !== (initialUsernameRef.current ?? '');
        if (usernameChanged) {
          const lastUpdated = cleanSettings.username_last_updated_at;
          if (lastUpdated) {
            const date = new Date(lastUpdated);
            const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 30) {
              toast({ title: 'خطأ', description: 'لا يمكن تغيير اسم المستخدم إلا مرة واحدة كل 30 يوماً.', variant: 'destructive' });
              return;
            }
          }
        }

        const updateData: Record<string, unknown> = {
            ...cleanSettings,
            username: newUsername || cleanSettings.username,
            logo: logoUrl || null,
            applications: updatedApplications || [],
            updated_at: new Date().toISOString(),
        };
        if (usernameChanged) {
          updateData.username_last_updated_at = new Date().toISOString();
          initialUsernameRef.current = newUsername;
        }

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const { error } = await supabase
            .from('restaurants')
            .update(updateData)
            .eq('id', user.restaurantId);
        if (error) throw error;

        syncPublicPage(user.restaurantId!).catch(() => {});

        if (logoFile) {
          await supabase.from('activity').insert({
            type: "logo_added",
            restaurantId: user.restaurantId,
            restaurantName: settings.name || null,
            userId: user.uid,
            timestamp: new Date().toISOString(),
          });
        }

        toast({ title: "تم حفظ التغييرات بنجاح!" });

      } catch (e: any) {
          toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
      }
    });
  };

  const toggleGlobalApp = (app: any) => {
    const isAlreadyAdded = settings.applications?.some((a: any) => a.platformId === app.id);
    if (isAlreadyAdded) {
      setSettings({
        ...settings,
        applications: settings.applications.filter((a: any) => a.platformId !== app.id)
      });
    } else {
      const newApp = {
        id: `global-${app.id}`,
        type: 'global',
        platformId: app.id,
        name: app.name,
        logo: app.logo_url,
        value: ''
      };
      setSettings({
        ...settings,
        applications: [...(settings.applications || []), newApp]
      });
    }
  };

  const addCustomApp = () => {
    const customCount = settings.applications?.filter((a: any) => a.type === 'custom').length || 0;
    if (customCount >= 2) {
        toast({ title: "الحد الأقصى للتطبيقات الخاصة هو 2", variant: "destructive" });
        return;
    }
    const newApp = {
      id: `custom-${Date.now()}`,
      type: 'custom',
      name: 'تطبيق جديد',
      logo: '',
      value: ''
    };
    setSettings({
      ...settings,
      applications: [...(settings.applications || []), newApp]
    });
  };

  const removeApp = (id: string) => {
    setSettings({
      ...settings,
      applications: settings.applications.filter((a: any) => a.id !== id)
    });
  };

  const updateAppField = (id: string, field: string, value: string) => {
    setSettings({
      ...settings,
      applications: settings.applications.map((a: any) => a.id === id ? { ...a, [field]: value } : a)
    });
  };

  const handleAppLogoChange = (appId: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setCustomAppFiles(prev => ({ ...prev, [appId]: file }));
    setSettings({
        ...settings,
        applications: settings.applications.map((a: any) => a.id === appId ? { ...a, logo: previewUrl } : a)
    });
  };

  const addSocialLink = (platform: string) => {
    const newLink = { id: Math.random().toString(36).substr(2, 9), platform, value: '' };
    setSettings({ ...settings, socialLinks: [...(settings.socialLinks || []), newLink] });
  };

  const removeSocialLink = (id: string) => {
    setSettings({ ...settings, socialLinks: (settings.socialLinks || []).filter((l: any) => l.id !== id) });
  };

  const updateSocialLink = (id: string, value: string) => {
    setSettings({
      ...settings,
      socialLinks: (settings.socialLinks || []).map((l: any) => l.id === id ? { ...l, value } : l)
    });
  };

  if (loading || !settings) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-8" dir="rtl">
      <PageHeader title="تخصيص الواجهة" description="صمم هويتك البصرية والروابط الخاصة بك.">
          <Button variant="outline" asChild>
              <Link href={`/hub/${settings.username}`} target="_blank">
                  <Globe className="ml-2 h-4 w-4" /> معاينة الصفحة العامة
              </Link>
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin h-4 w-4 ml-2" /> : <Check className="ml-2 h-4 w-4" />}
              حفظ التغييرات
          </Button>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 items-start min-w-0">
        <div className="xl:col-span-1 space-y-6 min-w-0">
            <Accordion type="multiple" defaultValue={['branding', 'colors', 'apps', 'social']} className="space-y-4">
                <AccordionItem value="branding" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="font-bold hover:no-underline text-right">
                        <div className="flex items-center gap-2"><Layout className="h-4 w-4 text-primary"/> الهوية البصرية</div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pb-6 text-right">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs">شعار التطبيق</Label>
                                <div className="relative w-32 h-32 mx-auto border-2 border-dashed rounded-2xl flex items-center justify-center bg-gray-50 cursor-pointer overflow-hidden group" onClick={() => fileInputRef.current?.click()}>
                                    <StorageImage imagePath={logoPreview} alt="Logo" fill className="object-contain p-2" sizes="128px" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">تغيير الشعار</div>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={e => { if(e.target.files?.[0]) { setLogoFile(e.target.files[0]); setLogoPreview(URL.createObjectURL(e.target.files[0])); } }} className="hidden" accept="image/*" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">اسم المطعم</Label>
                            <Input value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="text-right" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">اسم المستخدم (لرابط الصفحة العامة)</Label>
                            <Input
                                dir="ltr"
                                value={settings.username ?? ''}
                                onChange={e => setSettings({ ...settings, username: e.target.value })}
                                placeholder="اسم-المطعم"
                                className="text-right font-mono text-sm"
                                disabled={(() => {
                                    const lastUpdated = settings.username_last_updated_at;
                                    if (!lastUpdated) return false;
                                    const date = new Date(lastUpdated);
                                    const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
                                    return daysSince < 30;
                                })()}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                الرابط النهائي: /hub/{settings.username || 'اسم المستخدم'}. يُمكن تغيير اسم المستخدم مرة واحدة كل 30 يوماً.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">الوصف</Label>
                            <Textarea value={settings.description || ''} onChange={e => setSettings({...settings, description: e.target.value})} rows={2} className="text-right" />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="colors" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="font-bold hover:no-underline text-right">
                        <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-primary"/> الألوان</div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pb-6 text-right">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 text-xs"
                            onClick={handleSuggestColors}
                            disabled={isSuggestingColors || !logoPreview}
                        >
                            {isSuggestingColors ? <Loader2 className="h-3 w-3 animate-spin" /> : <Palette className="h-3 w-3" />}
                            استخراج الألوان من الشعار
                        </Button>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <Label className="text-xs font-bold">اللون الأساسي</Label>
                                <Input type="color" value={settings.primaryColor || '#714dfa'} onChange={e => setSettings({...settings, primaryColor: e.target.value})} className="w-12 h-8 p-0 border-0" />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <Label className="text-xs font-bold">لون الخلفية</Label>
                                <Input type="color" value={settings.secondaryColor || '#ffffff'} onChange={e => setSettings({...settings, secondaryColor: e.target.value})} className="w-12 h-8 p-0 border-0" />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="apps" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="font-bold hover:no-underline text-right">
                        <div className="flex items-center gap-2"><AppWindow className="h-4 w-4 text-primary"/> التطبيقات</div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pb-6 text-right">
                        <div className="flex flex-wrap gap-2 justify-end">
                            {globalApps.map(app => {
                                const isAdded = settings.applications?.some((a: any) => a.platformId === app.id);
                                return (
                                    <Button
                                        key={app.id}
                                        variant={isAdded ? "default" : "outline"}
                                        size="sm"
                                        className="h-9 gap-2 text-xs rounded-full"
                                        onClick={() => toggleGlobalApp(app)}
                                    >
                                        <div className="relative w-4 h-4 shrink-0">
                                            <StorageImage imagePath={app.logo_url} alt={app.name} fill className="object-contain" sizes="16px" />
                                        </div>
                                        {app.name}
                                    </Button>
                                );
                            })}
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <div className="flex justify-between items-center flex-row-reverse">
                                <h4 className="text-sm font-bold">تطبيقات خاصة</h4>
                                <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={addCustomApp}>
                                    <PlusCircle className="ml-1 h-3 w-3" /> إضافة
                                </Button>
                            </div>
                            {settings.applications?.map((app: any) => (
                                <div key={app.id} className="p-4 bg-gray-50 rounded-xl border space-y-3 relative text-right">
                                    <div className="flex items-center gap-3 flex-row-reverse">
                                        <div
                                            className="relative w-10 h-10 rounded-md bg-white border flex items-center justify-center shrink-0 overflow-hidden cursor-pointer"
                                            onClick={() => app.type === 'custom' && appLogoInputRefs.current[app.id]?.click()}
                                        >
                                            {app.logo ? <StorageImage imagePath={app.logo} alt={app.name} fill className="object-contain p-1" sizes="40px" /> : <ImageIcon size={20} className="opacity-20" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {app.type === 'global' ? <p className="text-xs font-bold">{app.name}</p> : <Input value={app.name} onChange={e => updateAppField(app.id, 'name', e.target.value)} className="h-7 text-xs font-bold text-right" />}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeApp(app.id)}><X size={14} /></Button>
                                    </div>
                                    <Input dir="ltr" value={app.value} onChange={e => updateAppField(app.id, 'value', e.target.value)} placeholder="https://..." className="h-8 text-xs" />
                                    {app.type === 'custom' && <input type="file" ref={el => { appLogoInputRefs.current[app.id] = el; }} onChange={e => e.target.files?.[0] && handleAppLogoChange(app.id, e.target.files[0])} className="hidden" accept="image/*" />}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="social" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="font-bold hover:no-underline text-right">
                        <div className="flex items-center gap-2"><LinkIcon className="h-4 w-4 text-primary"/> التواصل الاجتماعي</div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-6 text-right">
                        <div className="flex flex-wrap gap-2 justify-end">
                            {SOCIAL_PLATFORMS.map(p => (
                                <Button
                                    key={p.value}
                                    variant="outline"
                                    size="sm"
                                    className="h-9 gap-2 text-[10px] rounded-full px-4"
                                    onClick={() => addSocialLink(p.value)}
                                    disabled={(settings.socialLinks || []).some((l: any) => l.platform === p.value && p.value !== 'website')}
                                >
                                    <p.icon size={14} style={{ color: p.color }} />
                                    {p.label}
                                </Button>
                            ))}
                        </div>
                        <div className="space-y-3">
                            {(settings.socialLinks || []).map((link: any) => {
                                const platform = SOCIAL_PLATFORMS.find(p => p.value === link.platform);
                                const Icon = platform?.icon || WebsiteIcon;
                                return (
                                    <div key={link.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border flex-row-reverse">
                                        <div className="p-2 bg-white rounded-md border shrink-0">
                                            <Icon size={16} style={{ color: platform?.color }} />
                                        </div>
                                        <Input dir="ltr" value={link.value} onChange={e => updateSocialLink(link.id, e.target.value)} placeholder="الرابط..." className="h-9 text-xs" />
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeSocialLink(link.id)}><X size={14}/></Button>
                                    </div>
                                )
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>

        <div className="xl:col-span-2 flex flex-col items-center min-w-0 overflow-x-hidden px-4 sm:px-0">
          <div className="sticky top-24 w-full max-w-[360px] self-start mx-auto">
            <div
                className="relative border-[10px] border-gray-900 rounded-[3rem] overflow-hidden shadow-xl md:shadow-2xl w-full aspect-[9/19] flex flex-col min-h-[400px] bg-white"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-xl z-30" />
              <div className="flex-1 min-h-0 w-full relative pt-2">
                {settings?.username ? (
                  <iframe
                    key={settings.username}
                    src={`/hub/${settings.username}`}
                    title="معاينة الصفحة العامة"
                    className="w-full h-full min-h-[600px] border-0 rounded-b-[2rem] bg-white"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground text-sm p-6 text-center">
                    <Smartphone className="h-12 w-12 mb-4 opacity-50" />
                    <p>احفظ اسم المستخدم أولاً لرؤية المعاينة الحية</p>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-4 flex items-center justify-center gap-2">
                <Smartphone className="h-3 w-3"/> معاينة حية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
