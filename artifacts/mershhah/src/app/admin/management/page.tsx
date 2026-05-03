'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Building2, ShieldAlert, KeyRound, Loader2, Sparkles, CreditCard, Clock, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { format, addMonths, isAfter } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/dashboard/PageHeader';
import { RestaurantsTable } from '@/components/admin/management/RestaurantsTable';
import type { Profile, Plan, Subscription } from '@/lib/types';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  restaurant_name: z.string().min(2, 'اسم المشروع مطلوب'),
  full_name: z.string().min(2, 'الاسم الكامل مطلوب'),
  email: z.string().email('إيميل غير صحيح'),
  phone_number: z.string().optional().nullable(),
  account_status: z.enum(['active', 'pending', 'suspended']),
});
type FormValues = z.infer<typeof formSchema>;

function ProfileDetails({
  profileId,
  onSave,
  onDeleteRequest,
}: {
  profileId: string | null;
  onSave: () => void;
  onDeleteRequest: (profile: Profile) => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const [isActivating, startActivating] = useTransition();
  const { toast } = useToast();
  const [activePlans, setActivePlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase.from('plans').select('*').eq('is_active', true);
      const plans = (data || []) as Plan[];
      setActivePlans(plans);
      if (plans.length > 0) {
        const featured = plans.find((p) => p.is_featured);
        setSelectedPlanId((prev) => prev || (featured ? featured.id : plans[0].id));
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    if (!profileId) {
      setProfile(null);
      setCurrentSub(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchProfile = async () => {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', profileId).single();
      if (!isMounted) return;

      if (profileData) {
        setProfile(profileData as Profile);
        form.reset({
          restaurant_name: profileData.restaurant_name || '',
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          phone_number: profileData.phone_number || '',
          account_status: profileData.account_status || 'pending',
        });

        const { data: subsData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('profile_id', profileId);

        if (!isMounted) return;
        const subs = (subsData || []) as Subscription[];
        const activeSubs = subs
          .filter((s) => s.status === 'active')
          .sort((a, b) => new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime());
        setCurrentSub(activeSubs[0] || null);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    };

    fetchProfile();

    const channel = supabase
      .channel(`profile-detail-${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` }, () => {
        fetchProfile();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [profileId, form]);

  function onSubmit(values: FormValues) {
    startSaving(async () => {
      if (!profile) return;
      try {
        await supabase.from('profiles').update({
          restaurant_name: values.restaurant_name,
          full_name: values.full_name,
          phone_number: values.phone_number,
          account_status: values.account_status,
        }).eq('id', profile.id);

        if (profile.restaurant_id) {
          await supabase.from('restaurants').update({ name: values.restaurant_name }).eq('id', profile.restaurant_id);
        }

        toast({ title: `تم تحديث بيانات "${values.restaurant_name}" بنجاح` });
        onSave();
      } catch (err: any) {
        toast({ title: 'خطأ في الحفظ', description: err.message, variant: 'destructive' });
      }
    });
  }

  const handleActivateOrRenew = () => {
    const selectedPlan = activePlans.find((p) => p.id === selectedPlanId);
    if (!profile || !selectedPlan) {
      toast({ title: 'بيانات ناقصة', description: 'الرجاء اختيار باقة اشتراك صالحة.', variant: 'destructive' });
      return;
    }

    startActivating(async () => {
      try {
        await supabase.from('profiles').update({ account_status: 'active' }).eq('id', profile.id);

        if (profile.restaurant_id) {
          await supabase.from('restaurants')
            .update({ is_paid_plan: selectedPlan.id !== 'free' })
            .eq('id', profile.restaurant_id);
        }

        let startDate = new Date();
        const subEndDate = currentSub?.end_date ? new Date(currentSub.end_date) : null;
        if (currentSub && currentSub.plan_id !== 'free' && subEndDate && isAfter(subEndDate, startDate)) {
          startDate = subEndDate;
        }
        const endDate = addMonths(startDate, selectedPlan.duration_months);

        await supabase.from('subscriptions').insert({
          id: crypto.randomUUID(),
          profile_id: profile.id,
          plan_name: selectedPlan.name,
          plan_id: selectedPlan.id,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

        toast({ title: 'تم تجديد/تفعيل الاشتراك بنجاح!' });
        onSave();
      } catch (err: any) {
        toast({ title: 'خطأ في التفعيل', description: err.message, variant: 'destructive' });
      }
    });
  };

  const handleDelete = () => { if (profile) onDeleteRequest(profile); };

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
      if (error) throw error;
      toast({
        title: 'تم إرسال رابط التغيير',
        description: `تم إرسال تعليمات إعادة تعيين كلمة المرور إلى بريد ${profile.email}`,
      });
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <Card className="h-full flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></Card>;
  }

  if (!profile) {
    return (
      <Card className="h-full flex flex-col border-dashed bg-muted/10">
        <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground flex-1">
          <div className="p-4 bg-muted rounded-full mb-4">
            <Building2 className="h-12 w-12 opacity-20" />
          </div>
          <h3 className="text-lg font-bold text-foreground">لم يتم اختيار مشترك</h3>
          <p className="max-w-xs mx-auto mt-2 text-sm">
            اختر أحد أصحاب المشاريع من القائمة الجانبية لعرض ملفه الشخصي وإدارة اشتراكه.
          </p>
        </div>
      </Card>
    );
  }

  const subEndDate = currentSub?.end_date ? new Date(currentSub.end_date) : null;
  const isSubActive = subEndDate && isAfter(subEndDate, new Date());

  return (
    <Card className="h-full flex flex-col shadow-md overflow-hidden">
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg"><User className="w-5 h-5 text-primary" /></div>
          إدارة حساب: {profile.restaurant_name}
        </CardTitle>
        <CardDescription>إدارة البيانات الأساسية، تجديد الاشتراكات، والتحكم في صلاحيات الوصول.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> الاشتراك الحالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentSub ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">الباقة:</span>
                    <Badge variant="secondary" className="font-bold">{currentSub.plan_name}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">تاريخ الانتهاء:</span>
                    <span className={cn('text-sm font-bold', isSubActive ? 'text-green-600' : 'text-destructive')}>
                      {currentSub.plan_id === 'free' ? 'دائم' : (subEndDate ? format(subEndDate, 'dd MMMM yyyy', { locale: ar }) : '—')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">الحالة:</span>
                    <Badge className={isSubActive ? 'bg-green-500' : 'bg-destructive'}>
                      {isSubActive ? 'نشط' : 'منتهي'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground italic">لا يوجد سجل اشتراك نشط حالياً.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> تجديد أو تفعيل اشتراك
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">اختر الباقة</Label>
                <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="اختر الباقة..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {activePlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.price} ر.س / {p.duration_months} أشهر)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full h-10 font-bold shadow-sm"
                onClick={handleActivateOrRenew}
                disabled={isActivating || !selectedPlanId}
              >
                {isActivating ? <Loader2 className="animate-spin ml-2 h-4 w-4" /> : <Clock className="ml-2 h-4 w-4" />}
                {isSubActive && currentSub?.plan_id !== 'free' ? 'تجديد (تمديد الصلاحية)' : 'تفعيل باقة جديدة'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-bold text-lg">تعديل بيانات الحساب</h3>
          <Card className="border-none shadow-none bg-transparent">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="restaurant_name" render={({ field }) => (
                    <FormItem><FormLabel>اسم المشروع</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem><FormLabel>اسم المالك</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input type="email" {...field} disabled /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone_number" render={({ field }) => (
                    <FormItem><FormLabel>رقم الجوال</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="account_status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الحساب العامة</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent dir="rtl">
                        <SelectItem value="pending">بانتظار المراجعة (لم يدفع)</SelectItem>
                        <SelectItem value="active">نشط (حساب مفعل)</SelectItem>
                        <SelectItem value="suspended">معلق (موقوف مؤقتاً)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="pt-4">
                  <Button type="submit" className="w-full md:w-auto px-10" disabled={isSaving}>
                    {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-bold text-lg text-destructive flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> منطقة الخطر
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-dashed">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">إعادة تعيين كلمة المرور</CardTitle>
                <CardDescription className="text-xs">سيتم إرسال رابط آمن لبريد المشترك.</CardDescription>
              </CardHeader>
              <CardFooter className="p-4 pt-0">
                <Button variant="outline" size="sm" className="w-full" onClick={handleResetPassword}>
                  <KeyRound className="h-4 w-4 ml-2" />إرسال الرابط
                </Button>
              </CardFooter>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5 border-dashed">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm text-destructive">حذف المشترك</CardTitle>
                <CardDescription className="text-xs">حذف نهائي للبيانات والمطعم المرتبط.</CardDescription>
              </CardHeader>
              <CardFooter className="p-4 pt-0">
                <Button variant="destructive" size="sm" className="w-full" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 ml-2" />حذف البيانات
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagementPage() {
  const [subscribers, setSubscribers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const fetchSubscribers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'owner')
      .order('created_at', { ascending: false });
    const profiles = (data || []) as Profile[];
    setSubscribers(profiles);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSubscribers();

    const channel = supabase
      .channel('profiles-management')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchSubscribers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSubscribers]);

  useEffect(() => {
    if (!selectedProfileId && subscribers.length > 0) {
      setSelectedProfileId(subscribers[0].id);
    }
  }, [subscribers, selectedProfileId]);

  const handleProfileSelect = useCallback((profile: Profile) => {
    setSelectedProfileId(profile.id);
  }, []);

  const handleDeleteRequest = (profile: Profile) => setProfileToDelete(profile);

  const handleDeleteConfirm = () => {
    if (!profileToDelete) return;
    startDeleteTransition(async () => {
      try {
        await supabase.from('profiles').delete().eq('id', profileToDelete.id);
        if (profileToDelete.restaurant_id) {
          await supabase.from('restaurants').delete().eq('id', profileToDelete.restaurant_id);
        }
        await supabase.from('chats').delete().eq('id', profileToDelete.id);

        toast({ title: 'تم الحذف', description: `تم حذف بيانات ${profileToDelete.restaurant_name}.` });
        setProfileToDelete(null);
        if (selectedProfileId === profileToDelete.id) {
          const remaining = subscribers.filter((s) => s.id !== profileToDelete.id);
          setSelectedProfileId(remaining.length > 0 ? remaining[0].id : null);
        }
      } catch (err: any) {
        toast({ title: 'خطأ في الحذف', description: err.message, variant: 'destructive' });
        setProfileToDelete(null);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-auto p-4 lg:p-6 pb-20">
        <PageHeader title="إدارة المشتركين" description="إدارة حسابات أصحاب المشاريع والمشتركين في المنصة." />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
          <Skeleton className="h-full" />
          <div className="xl:col-span-2"><Skeleton className="h-full" /></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-8.5rem)] p-4 lg:p-6">
        <PageHeader title="إدارة المشتركين" description="اختر مشتركًا من القائمة لعرض وتعديل بياناته." />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-4 flex-1 min-h-0">
          <div className="xl:col-span-1 h-full">
            <RestaurantsTable
              restaurants={subscribers}
              selectedProfileId={selectedProfileId}
              onProfileSelect={handleProfileSelect}
            />
          </div>
          <div className="xl:col-span-2 h-full">
            <ProfileDetails
              profileId={selectedProfileId}
              onSave={fetchSubscribers}
              onDeleteRequest={handleDeleteRequest}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={!!profileToDelete} onOpenChange={(open) => !open && setProfileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف النهائي؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف حساب <strong>{profileToDelete?.restaurant_name}</strong> وجميع بياناته المرتبطة بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              نعم، قم بالحذف النهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
