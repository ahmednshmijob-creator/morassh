'use client';

import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, KeyRound, CreditCard, Calendar, ArrowUpRight, Zap, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

const profileFormSchema = z.object({
  full_name: z.string().min(3, { message: 'الاسم يجب أن يكون 3 أحرف على الأقل.' }),
  phone_number: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function OwnerSettingsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSaving, startSaving] = useTransition();
  const [isSendingReset, startSendingReset] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { full_name: '', phone_number: '' },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user, form]);

  const handleProfileUpdate = async (data: ProfileFormValues) => {
    if (!user) return;
    startSaving(async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: data.full_name, phone_number: data.phone_number })
          .eq('id', user.uid);
        if (error) throw error;
        toast({ title: 'تم تحديث ملفك الشخصي بنجاح!' });
      } catch (error: any) {
        toast({ title: 'خطأ', description: 'فشل تحديث الملف الشخصي: ' + error.message, variant: 'destructive' });
      }
    });
  };

  const handlePasswordReset = () => {
    if (!user?.email) return;
    startSendingReset(async () => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email);
        if (error) throw error;
        toast({ title: 'تم إرسال الرابط', description: 'لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' });
      } catch (error: any) {
        toast({ title: 'خطأ', description: 'فشل إرسال رابط إعادة التعيين: ' + error.message, variant: 'destructive' });
      }
    });
  };

  if (isUserLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="الإعدادات" description="عدّل إعدادات حسابك وتفضيلاتك." />
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-2/3 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
            </CardContent>
            <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" /><Skeleton className="h-4 w-3/4 mt-2" />
            </CardHeader>
            <CardContent><Skeleton className="h-10 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { entitlements } = user!;
  const daysRemaining = entitlements.endDate ? differenceInDays(entitlements.endDate, new Date()) : 0;
  const isFree = entitlements.planId === 'free' || entitlements.planId === 'none';

  return (
    <div className="space-y-8 pb-10">
      <PageHeader title="الإعدادات" description="إدارة معلوماتك الشخصية، الأمان، وتفاصيل اشتراكك." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card className="shadow-sm border-gray-100">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleProfileUpdate)}>
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">الملف الشخصي</CardTitle>
                <CardDescription>هذه هي معلوماتك الشخصية التي تظهر في المنصة.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">الاسم الكامل</FormLabel>
                    <FormControl><Input {...field} className="h-11 rounded-xl bg-gray-50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">رقم الجوال</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} className="h-11 rounded-xl bg-gray-50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="space-y-2">
                  <Label className="font-bold">البريد الإلكتروني</Label>
                  <Input value={user?.email || ''} disabled className="h-11 rounded-xl bg-gray-100" />
                  <p className="text-[10px] text-muted-foreground">لا يمكن تغيير البريد الإلكتروني بعد التسجيل.</p>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={isSaving} className="rounded-xl">
                  {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  حفظ التغييرات
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className="shadow-sm border-gray-100 overflow-hidden">
          <CardHeader className="bg-primary/5 pb-8">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  الاشتراك والباقة
                </CardTitle>
                <CardDescription>إدارة خطة اشتراكك ومميزات حسابك.</CardDescription>
              </div>
              <Badge variant={isFree ? 'secondary' : 'default'} className="rounded-full px-4 py-1 font-bold">
                {entitlements.planName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">ينتهي في</span>
                </div>
                <p className="font-black text-lg">
                  {isFree ? 'دائم' : (entitlements.endDate ? format(entitlements.endDate, 'dd MMMM yyyy', { locale: ar }) : 'غير محدد')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">المتبقي</span>
                </div>
                <p className="font-black text-lg">{isFree ? 'غير محدود' : `${daysRemaining} يوم`}</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-700">مزايا باقتك الحالية:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-50 p-2 rounded-lg">
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>الواجهة الرقمية والمنيو (مفعل)</span>
                </li>
                {entitlements.canUseAiAnalysis && (
                  <li className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/5 p-2 rounded-lg">
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>أدوات التحليل والذكاء الاصطناعي (مفعل)</span>
                  </li>
                )}
                {entitlements.canUseStudioImageGeneration && (
                  <li className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/5 p-2 rounded-lg">
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>استوديو الصور الإبداعي (مفعل)</span>
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-gray-50/50 p-6">
            <Button asChild variant="outline" className="w-full gap-2 rounded-xl bg-white shadow-sm border-gray-200">
              <Link href="/pricing">
                {isFree ? 'ترقية الباقة الآن' : 'تجديد أو تغيير الباقة'}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-sm border-gray-100 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">الأمان وكلمة المرور</CardTitle>
            <CardDescription>لأمان حسابك، قم بتغيير كلمة المرور بشكل دوري عبر بريدك الإلكتروني.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-6">
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              disabled={isSendingReset}
              className="w-full sm:w-auto h-12 px-8 rounded-xl gap-2"
            >
              {isSendingReset && <Loader2 className="h-4 w-4 animate-spin" />}
              <KeyRound className="h-4 w-4" />
              إرسال رابط تغيير كلمة المرور
            </Button>
            <div className="flex-1 text-center sm:text-right">
              <p className="text-sm text-muted-foreground">
                سنرسل لك رابطاً آمناً إلى بريدك الإلكتروني{' '}
                <span className="font-bold text-foreground">({user?.email})</span> لإنشاء كلمة مرور جديدة.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
