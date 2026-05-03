'use client';

import { useState, useEffect, useTransition, useRef, useMemo } from 'react';
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ImageGallery } from "@/components/studio/ImageGallery";
import { Loader2, Sparkles, Wand2, UploadCloud, ImageIcon, ImagePlus, Ticket, Bot } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

import type { MenuItem } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

import { generateMenuImage } from '@/ai/flows/generate-menu-image';
import { generateOfferImage } from '@/ai/flows/generate-offer-image';
import { redesignMenuImage } from '@/ai/flows/redesign-menu-image';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';


async function dataUriToBlob(dataUri: string): Promise<File> {
    const response = await fetch(dataUri);
    const blob = await response.blob();
    const fileExtension = blob.type.split('/')[1] || 'webp';
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    return new File([blob], fileName, { type: blob.type });
}

type StudioMode = 'product' | 'offer' | 'enhance';

export default function StudioPage() {
    const { user } = useUser();
    const { toast } = useToast();

    const [mode, setMode] = useState<StudioMode>('product');
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isProcessing, startProcessing] = useTransition();

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string>('');

    const [offerTitle, setOfferTitle] = useState('');
    const [offerDesc, setOfferDesc] = useState('');
    const [productStyle, setProductStyle] = useState('clean_white_background');
    const [offerStyle, setOfferStyle] = useState('modern_and_bold');
    const [customInstructions, setCustomInstructions] = useState('');
    const [userImageFile, setUserImageFile] = useState<File | null>(null);
    const [userImagePreview, setUserImagePreview] = useState<string | null>(null);
    const userImageInputRef = useRef<HTMLInputElement>(null);

    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

    const selectedItem = useMemo(() => menuItems.find(item => item.id === selectedItemId), [menuItems, selectedItemId]);
    const canUseStudio = user?.entitlements.canUseStudioImageGeneration ?? false;

    useEffect(() => {
        if (!user?.restaurantId) {
            setIsLoadingData(false);
            return;
        }

        setIsLoadingData(true);
        const restaurantId = user.restaurantId;

        const fetchMenuItems = async () => {
            const { data, error } = await supabase
                .from('menu_items')
                .select('*')
                .eq('restaurant_id', restaurantId);
            if (!error) setMenuItems((data || []) as MenuItem[]);
            setIsLoadingData(false);
        };

        fetchMenuItems();

        const channel = supabase.channel('studio_menu_items')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${restaurantId}` }, fetchMenuItems)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.restaurantId]);

    useEffect(() => {
        setGeneratedImageUrl(null);
        setUserImageFile(null);
        setUserImagePreview(null);
    }, [mode]);

    const handleUserImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) {
                toast({ title: "حجم الصورة كبير", description: "الرجاء اختيار صورة بحجم أقل من 4 ميجابايت.", variant: "destructive" });
                return;
            }
            setUserImageFile(file);
            setUserImagePreview(URL.createObjectURL(file));
            setGeneratedImageUrl(null);
        }
    };

    const saveImage = async (imageDataUrl: string, name: string, sourceItemId: string) => {
        if (!user?.restaurantId) throw new Error("لم يتم العثور على المطعم.");

        const file = await dataUriToBlob(imageDataUrl);
        const path = `restaurants/${user.restaurantId}/generated_images/${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('restaurant-assets')
            .upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const storagePath = uploadData.path;

        const now = new Date();
        const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await supabase.from('image_gallery').insert({
            restaurantId: user.restaurantId,
            storagePath,
            createdAt: now.toISOString(),
            expiresAt: expiryDate.toISOString(),
            sourceItemId,
            sourceItemName: name,
        });

        if (mode === 'product' || mode === 'enhance') {
            await supabase
                .from('menu_items')
                .update({ image_url: storagePath, image_last_generated_at: new Date().toISOString() })
                .eq('id', sourceItemId);
        }

        return storagePath;
    };

    const handleGenerate = () => {
        if (!user?.restaurantId) return;

        startProcessing(async () => {
            setGeneratedImageUrl(null);
            toast({ title: "🚀 جاري الإنشاء...", description: "يقوم الذكاء الاصطناعي بعمله. قد يستغرق الأمر دقيقة." });

            try {
                if (user.entitlements.planId === 'free' && !user.ai_trial_used) {
                    try {
                        await supabase.from('profiles').update({ ai_trial_used: true }).eq('id', user.uid);
                    } catch {
                        // ignore trial tracking error
                    }
                }

                let result: { imageDataUri: string } | null = null;
                let finalName = '';
                let finalId = '';

                switch (mode) {
                    case 'product':
                        if (!selectedItem) throw new Error("الرجاء اختيار منتج أولاً.");
                        finalName = selectedItem.name;
                        finalId = selectedItem.id;
                        result = await generateMenuImage({
                            itemName: selectedItem.name,
                            itemDescription: selectedItem.description,
                            style: productStyle as any,
                            customInstructions: customInstructions,
                        });
                        break;
                    case 'offer':
                        if (!offerTitle) throw new Error("الرجاء إدخال عنوان العرض.");
                        finalName = offerTitle;
                        finalId = `offer_${Date.now()}`;
                        result = await generateOfferImage({
                            offerTitle: offerTitle,
                            offerDescription: offerDesc,
                            style: offerStyle as any
                        });
                        break;
                    case 'enhance':
                        if (!userImageFile || !selectedItem) throw new Error("الرجاء رفع صورة واختيار منتج مرتبط.");
                        finalName = selectedItem.name;
                        finalId = selectedItem.id;

                        const fileDataUri = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(userImageFile);
                        });

                        result = await redesignMenuImage({
                            imageDataUri: fileDataUri,
                            itemName: selectedItem.name,
                            instruction: customInstructions,
                        });
                        break;
                }

                if (result) {
                    // increment daily count: fetch then update
                    const { data: restData } = await supabase
                        .from('restaurants')
                        .select('image_generation_daily_count')
                        .eq('id', user.restaurantId)
                        .single();
                    await supabase
                        .from('restaurants')
                        .update({ image_generation_daily_count: (restData?.image_generation_daily_count || 0) + 1 })
                        .eq('id', user.restaurantId);

                    await saveImage(result.imageDataUri, finalName, finalId);
                    setGeneratedImageUrl(result.imageDataUri);
                    toast({ title: "✅ تم الإنشاء والحفظ بنجاح!", description: "تم تحديث الصورة وحفظها في معرض الصور." });
                }

            } catch (e: any) {
                console.error("Studio processing failed:", e);
                toast({ title: "❌ فشل الإنشاء", description: e.message || "حدث خطأ غير متوقع.", variant: "destructive" });
            }
        });
    };


    return (
        <div className="space-y-8">
            <PageHeader
                title="استوديو مرشح"
                description="مساحتك الإبداعية لإنشاء صور احترافية لمنتجاتك وعروضك."
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-4 order-1 lg:order-none">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">معاينة التصميم</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-[4/3] border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30 p-2 relative overflow-hidden">
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                        <p className="text-muted-foreground font-medium">يقوم الذكاء الاصطناعي بالعمل...</p>
                                    </div>
                                )}
                                {generatedImageUrl && (
                                    <img
                                        src={generatedImageUrl}
                                        alt="Generated Image"
                                        className="object-contain"
                                    />
                                )}
                                {mode === 'enhance' && userImagePreview && !generatedImageUrl && (
                                    <img
                                        src={userImagePreview}
                                        alt="Uploaded Image"
                                        className="object-contain"
                                    />
                                )}
                                {!generatedImageUrl && !(mode === 'enhance' && userImagePreview) && (
                                    <div className="text-center text-muted-foreground">
                                        <Bot className="h-16 w-16 mx-auto mb-2" />
                                        <p className="font-semibold">ستظهر الصورة النهائية هنا</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="lg:sticky lg:top-20 order-2 lg:order-none">
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                             <Label>1. اختر الوضع</Label>
                             <RadioGroup value={mode} onValueChange={(v) => setMode(v as StudioMode)} className="grid grid-cols-3 gap-2">
                                <div><Button onClick={() => setMode('product')} variant={mode === 'product' ? 'default' : 'outline'} className="w-full flex-col h-16 gap-1"><ImageIcon/><span>منتج</span></Button></div>
                                <div><Button onClick={() => setMode('offer')} variant={mode === 'offer' ? 'default' : 'outline'} className="w-full flex-col h-16 gap-1"><Ticket/><span>عرض</span></Button></div>
                                <div><Button onClick={() => setMode('enhance')} variant={mode === 'enhance' ? 'default' : 'outline'} className="w-full flex-col h-16 gap-1"><Wand2/><span>إعادة تصميم</span></Button></div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                             <Label>2. حدد الإعدادات</Label>
                             <AnimatePresence mode="wait">
                                <motion.div
                                    key={mode}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    {mode === 'product' && (
                                        <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                                            <Select value={selectedItemId} onValueChange={setSelectedItemId} disabled={isLoadingData} dir="rtl"><SelectTrigger><SelectValue placeholder="اختر منتجًا من القائمة..." /></SelectTrigger><SelectContent>{isLoadingData ? <SelectItem value="loading" disabled>جاري التحميل...</SelectItem> : menuItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
                                            <Select value={productStyle} onValueChange={setProductStyle} dir="rtl"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="clean_white_background">صورة احترافية (خلفية بيضاء)</SelectItem><SelectItem value="realistic_restaurant_setting">لقطة واقعية (في مطعم)</SelectItem><SelectItem value="dramatic_charcoal_sketch">رسم فني (فحم)</SelectItem><SelectItem value="vibrant_watercolor_art">رسم فني (ألوان مائية)</SelectItem></SelectContent></Select>
                                        </div>
                                    )}
                                    {mode === 'offer' && (
                                         <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                                            <Input placeholder="عنوان العرض (سيظهر في الصورة)" value={offerTitle} onChange={e => setOfferTitle(e.target.value)} />
                                            <Textarea placeholder="وصف العرض (اختياري)" value={offerDesc} onChange={e => setOfferDesc(e.target.value)} />
                                            <Select value={offerStyle} onValueChange={setOfferStyle} dir="rtl"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="modern_and_bold">تصميم عصري وجريء</SelectItem><SelectItem value="elegant_and_minimalist">تصميم أنيق وبسيط</SelectItem><SelectItem value="fun_and_festive">تصميم مرح واحتفالي</SelectItem></SelectContent></Select>
                                         </div>
                                    )}
                                     {mode === 'enhance' && (
                                         <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                                            <p className="text-xs text-muted-foreground text-center">ارفع صورة تصميم أعجبك، اختر منتجك، وسيقوم الذكاء الاصطناعي بدمج منتجك في نفس التصميم.</p>
                                            <Select value={selectedItemId} onValueChange={setSelectedItemId} disabled={isLoadingData} dir="rtl"><SelectTrigger><SelectValue placeholder="اختر المنتج ليتم وضعه في الصورة" /></SelectTrigger><SelectContent>{isLoadingData ? <SelectItem value="loading" disabled>جاري التحميل...</SelectItem> : menuItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
                                            <input type="file" ref={userImageInputRef} onChange={handleUserImageChange} accept="image/*" className="hidden" />
                                            <Button variant="outline" onClick={() => userImageInputRef.current?.click()} className="w-full"><UploadCloud className="ml-2 h-4 w-4" />{userImagePreview ? 'تغيير صورة التصميم' : 'رفع صورة التصميم'}</Button>
                                         </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                         <div className="space-y-2">
                             <Label htmlFor="instructions">3. أضف تعليمات خاصة (اختياري)</Label>
                             <Textarea id="instructions" placeholder="مثال: اجعل الصورة تبدو ساخنة، أضف قطعًا من الفاكهة بجانب الطبق..." value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} />
                        </div>

                        <div className="w-full space-y-2 !mt-8">
                            <Button size="lg" className="w-full h-12 text-base" onClick={handleGenerate} disabled={isProcessing || !canUseStudio}>
                                {isProcessing ? <Loader2 className="ml-2 h-5 w-5 animate-spin"/> : <Sparkles className="ml-2 h-5 w-5" />}
                                {isProcessing ? 'جاري الإنشاء...' : 'أنشئ الصورة الآن'}
                            </Button>
                             {!canUseStudio && (
                                <p className="text-xs text-center text-muted-foreground">
                                    هذه الميزة متاحة في الباقات المدفوعة. <Link href="/pricing" className="text-primary underline font-semibold">عرض الباقات</Link>
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Separator className="my-8" />
             <div className="space-y-4">
                 <h2 className="text-xl font-bold">معرض الصور</h2>
                 <p className="text-sm text-muted-foreground">هنا تظهر الصور التي قمت بإنشائها أو رفعها. الصور المنشأة بالذكاء الاصطناعي تنتهي صلاحيتها بعد 30 يومًا.</p>
                <ImageGallery />
            </div>
        </div>
    );
}
