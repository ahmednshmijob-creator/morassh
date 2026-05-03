'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from '@/lib/navigation';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const formSchema = z.object({
  email: z.string().email({ message: 'الرجاء إدخال إيميل صحيح.' }),
  password: z.string().min(6, { message: 'كلمة المرور لازم تكون 6 أحرف عالأقل.' }),
});

const adminPages = [
  { href: '/admin/dashboard', permissionId: 'dashboard' },
  { href: '/admin/management', permissionId: 'management' },
  { href: '/admin/financials', permissionId: 'financials' },
  { href: '/admin/referrals', permissionId: 'referrals' },
  { href: '/admin/store-management', permissionId: 'store-management' },
  { href: '/admin/support', permissionId: 'support' },
  { href: '/admin/team', permissionId: 'team' },
  { href: '/admin/workflow', permissionId: 'workflow' },
  { href: '/admin/sales', permissionId: 'sales' },
];

const SUPER_ADMIN_EMAIL = 'ahmedsupsa@gmail.com';
const DEMO_EMAIL = 'demo@mershhah.com';

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'الإيميل أو كلمة المرور غير صحيحة.');
      }

      const userId = authData.user.id;

      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profile) {
        const isDemo = values.email === DEMO_EMAIL;
        const isSuperAdmin = values.email === SUPER_ADMIN_EMAIL;

        if (isDemo) {
          throw new Error('الحساب التجريبي غير موجود. يرجى الذهاب لصفحة التسجيل أولاً لإنشاء الحساب.');
        }

        let restaurantId: string | null = null;
        const now = new Date().toISOString();

        let uniqueUsername = '';
        if (!isSuperAdmin) {
          restaurantId = crypto.randomUUID();
          const emailPrefix = values.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          const randomSuffix = Math.floor(100 + Math.random() * 900);
          uniqueUsername = `${emailPrefix || 'restaurant'}-${randomSuffix}`;
        }

        // Insert profile FIRST (restaurants.owner_id FK requires profile to exist)
        const profileData: any = {
          id: userId,
          full_name: values.email.split('@')[0] || 'مستخدم جديد',
          email: values.email,
          phone_number: null,
          role: isSuperAdmin ? 'admin' : 'owner',
          account_status: 'active',
          created_at: now,
          restaurant_name: isSuperAdmin ? null : 'مشروعي',
          restaurant_id: restaurantId,
        };

        if (isSuperAdmin) {
          profileData.admin_permissions = [
            'dashboard', 'management', 'financials', 'store-management',
            'applications', 'announcements', 'support', 'team', 'workflow', 'sales',
          ];
        }

        await supabase.from('profiles').insert(profileData);
        profile = profileData as Profile;

        if (!isSuperAdmin && restaurantId) {
          await supabase.from('restaurants').insert({
            id: restaurantId,
            owner_id: userId,
            name: 'مشروعي',
            username: uniqueUsername,
            description: 'مطعم أو مقهى جديد – يمكنك تعديل الاسم والوصف من لوحة التحكم.',
            logo: null,
            primaryColor: '#6366F1',
            secondaryColor: '#F3F4F6',
            buttonTextColor: '#FFFFFF',
            borderRadius: 12,
            fontFamily: 'Cairo',
            socialLinks: null,
            deliveryApps: null,
            aiConfig: null,
            created_at: now,
            is_paid_plan: false,
          });

          const startDate = new Date();
          const endDate = new Date();
          endDate.setFullYear(startDate.getFullYear() + 100);

          await supabase.from('subscriptions').insert({
            id: crypto.randomUUID(),
            profile_id: userId,
            plan_id: 'free',
            plan_name: 'الباقة المجانية',
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          });

          await supabase.from('activity').insert([
            {
              id: crypto.randomUUID(),
              type: 'restaurant_created',
              restaurantId,
              restaurantName: 'مشروعي',
              userId,
              timestamp: now,
            },
            {
              id: crypto.randomUUID(),
              type: 'subscription_started',
              restaurantId,
              userId,
              planName: 'الباقة المجانية',
              restaurantName: 'مشروعي',
              timestamp: now,
            },
          ]);
        }
      }

      const userProfile = profile as Profile;

      if (userProfile.role === 'admin') {
        toast({ title: 'أهلاً بك أيها المدير!', description: 'يجري توجيهك الآن...' });
        let redirectPath = '/admin/dashboard';
        if (userProfile.email !== SUPER_ADMIN_EMAIL && userProfile.admin_permissions?.length) {
          const firstPermittedPage = adminPages.find((page) =>
            userProfile.admin_permissions!.includes(page.permissionId)
          );
          if (firstPermittedPage) redirectPath = firstPermittedPage.href;
        }
        router.push(redirectPath);
      } else if (userProfile.role === 'owner') {
        toast({ title: 'تم تسجيل الدخول بنجاح', description: 'حيّاك الله! سيتم توجيهك الآن.' });
        router.push('/owner/dashboard');
      } else {
        throw new Error('دور المستخدم غير معروف.');
      }
      router.refresh();
    } catch (error: any) {
      let description = 'الإيميل أو كلمة المرور غير صحيحة.';
      if (
        error.message?.includes('لم يتم العثور') ||
        error.message?.includes('الحساب التجريبي غير موجود')
      ) {
        description = error.message;
      }
      toast({ variant: 'destructive', title: 'خطأ في تسجيل الدخول', description });
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الإيميل</FormLabel>
              <FormControl>
                <Input type="email" placeholder="بريدك@example.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>كلمة المرور</FormLabel>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...field}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground left-2"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
          {isLoading ? 'لحظات...' : 'تسجيل الدخول'}
        </Button>
        <div className="text-center text-sm text-muted-foreground pt-4">
          ما عندك حساب؟{' '}
          <Link href="/register" className="text-primary hover:underline font-semibold">
            سوّ حساب جديد
          </Link>
        </div>
      </form>
    </Form>
  );
}
