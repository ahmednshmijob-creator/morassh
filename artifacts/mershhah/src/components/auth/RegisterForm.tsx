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
import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'ahmedsupsa@gmail.com';
const DEMO_EMAIL = 'demo@mershhah.com';
const DEMO_PASSWORD = 'demo123';

const allAdminPermissions = [
  'dashboard', 'management', 'financials', 'store-management',
  'applications', 'announcements', 'support', 'team', 'workflow', 'sales',
];

const formSchema = z
  .object({
    fullName: z.string().min(2, { message: 'الاسم الكامل لازم يكون حرفين عالأقل.' }),
    restaurantName: z.string().optional(),
    phoneNumber: z.string().optional(),
    email: z.string().email({ message: 'الرجاء إدخال إيميل صحيح.' }),
    password: z.string().min(6, { message: 'كلمة المرور لازم تكون 6 أحرف عالأقل.' }),
  })
  .superRefine((data, ctx) => {
    if (data.email !== ADMIN_EMAIL) {
      if (!data.restaurantName || data.restaurantName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'اسم مشروعك التجاري لازم يكون حرفين عالأقل.',
          path: ['restaurantName'],
        });
      }
      if (!data.phoneNumber || data.phoneNumber.length < 9) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'الرجاء إدخال رقم جوال صحيح.',
          path: ['phoneNumber'],
        });
      }
    }
  });

export function RegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      restaurantName: '',
      phoneNumber: '',
      email: '',
      password: '',
    },
  });

  const emailValue = form.watch('email');
  const isDemoFlow = emailValue === DEMO_EMAIL;
  const isAdminFlow = emailValue === ADMIN_EMAIL;

  useEffect(() => {
    if (isDemoFlow) {
      form.setValue('password', DEMO_PASSWORD);
    } else {
      if (form.getValues('password') === DEMO_PASSWORD) {
        form.setValue('password', '');
      }
    }
  }, [isDemoFlow, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: { full_name: values.fullName } },
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('لم يتم إنشاء الحساب. حاول مرة أخرى.');

      // If email confirmation is required, session will be null
      if (!authData.session) {
        toast({
          title: 'تحقق من بريدك الإلكتروني',
          description: 'تم إرسال رابط تأكيد إلى بريدك. افتح الرابط ثم سجل الدخول.',
        });
        setIsLoading(false);
        return;
      }

      const userId = authData.user.id;
      const isDemoUser = values.email === DEMO_EMAIL;
      const isAdmin = values.email === ADMIN_EMAIL;
      const now = new Date().toISOString();
      let restaurantId: string | null = null;

      let uniqueUsername = '';
      if (!isAdmin) {
        restaurantId = crypto.randomUUID();
        const emailPrefix = values.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        uniqueUsername = isDemoUser ? 'democafe' : `${emailPrefix}-${randomSuffix}`;
      }

      // Insert profile FIRST (restaurants.owner_id FK requires profile to exist)
      const profileData: any = {
        id: userId,
        full_name: values.fullName,
        email: values.email,
        phone_number: values.phoneNumber || null,
        role: isAdmin ? 'admin' : 'owner',
        account_status: 'active',
        created_at: now,
        restaurant_name: isAdmin ? null : values.restaurantName,
        restaurant_id: restaurantId,
      };

      if (isAdmin) {
        profileData.admin_permissions = allAdminPermissions;
      }

      const { error: profileInsertError } = await supabase.from('profiles').insert(profileData);
      if (profileInsertError) throw new Error(profileInsertError.message);

      if (!isAdmin && restaurantId) {
        await supabase.from('restaurants').insert({
          id: restaurantId,
          owner_id: userId,
          name: values.restaurantName,
          username: uniqueUsername,
          description: 'مقهى ومطعم يقدم أشهى المأكولات والمشروبات في أجواء عصرية ومريحة. حياكم!',
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
      }

      if (!isAdmin && restaurantId) {
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
            restaurantName: values.restaurantName,
            userId,
            timestamp: now,
          },
          {
            id: crypto.randomUUID(),
            type: 'subscription_started',
            restaurantId,
            userId,
            planName: 'الباقة المجانية',
            restaurantName: values.restaurantName,
            timestamp: now,
          },
        ]);
      }

      if (isDemoUser && restaurantId) {
        const mockMenuItems = [
          { name: 'برجر لحم كلاسيك', description: 'قطعة لحم بقري مشوي مع جبنة شيدر، خس، طماطم، وبصل في خبز بريوش طري.', category: 'برجر', sizes: [{ id: crypto.randomUUID(), name: 'عادي', price: 28, cost: 12 }], status: 'available', display_tags: 'best_seller' },
          { name: 'برجر دجاج كرسبي', description: 'صدر دجاج مقلي مقرمش مع صوص خاص، مخلل، وخس.', category: 'برجر', sizes: [{ id: crypto.randomUUID(), name: 'عادي', price: 26, cost: 10 }], status: 'available', display_tags: 'none' },
          { name: 'بطاطس مقلية', description: 'بطاطس ذهبية مقرمشة مملحة بشكل مثالي.', category: 'مقبلات', sizes: [{ id: crypto.randomUUID(), name: 'عادي', price: 9, cost: 3 }], status: 'available', display_tags: 'none' },
          { name: 'حلقات البصل', description: 'حلقات بصل مقلية مقرمشة تقدم مع اختيارك من الصوصات.', category: 'مقبلات', sizes: [{ id: crypto.randomUUID(), name: 'عادي', price: 12, cost: 4 }], status: 'available', display_tags: 'new' },
          { name: 'مشروب غازي', description: 'كوكاكولا، سبرايت، أو فانتا.', category: 'مشروبات', sizes: [{ id: crypto.randomUUID(), name: 'عادي', price: 5, cost: 1 }], status: 'available', display_tags: 'none' },
          { name: 'ميلك شيك فانيلا', description: 'ميلك شيك كريمي بنكهة الفانيلا الغنية.', category: 'حلويات', sizes: [{ id: crypto.randomUUID(), name: 'عادي', price: 18, cost: 7 }], status: 'unavailable', display_tags: 'none' },
        ];

        await supabase.from('menu_items').insert(
          mockMenuItems.map((item, index) => ({
            id: crypto.randomUUID(),
            ...item,
            restaurant_id: restaurantId,
            position: index,
            created_at: now,
          }))
        );
      }

      toast({
        title: 'تم التسجيل بنجاح!',
        description: isAdmin ? 'أهلاً بك أيها المدير.' : 'أهلاً بك! تم تفعيل الباقة المجانية لحسابك.',
      });

      if (isAdmin) {
        router.push('/admin/dashboard');
      } else {
        router.push('/owner/dashboard');
      }
      router.refresh();
    } catch (error: any) {
      const msg: string = error?.message || '';
      let description = msg || 'حدث خطأ غير متوقع.';
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('User already registered')) {
        description = 'هذا البريد الإلكتروني مسجل مسبقًا. جرّب تسجيل الدخول.';
      } else if (msg.includes('Email rate limit')) {
        description = 'تم إرسال رسائل كثيرة. انتظر قليلاً وحاول مجدداً.';
      }
      toast({ variant: 'destructive', title: 'خطأ في إنشاء الحساب', description });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الاسم الكامل</FormLabel>
              <FormControl>
                <Input placeholder="مثال: خالد الأحمد" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        {!isAdminFlow && (
          <>
            <FormField
              control={form.control}
              name="restaurantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم مشروعك التجاري (مطعم/مقهى)</FormLabel>
                  <FormControl>
                    <Input placeholder="مشروعي" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الجوال</FormLabel>
                  <FormControl>
                    <Input placeholder="05xxxxxxxx" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>كلمة المرور</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...field}
                    disabled={isLoading || isDemoFlow}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground left-2"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                    <span className="sr-only">{showPassword ? 'إخفاء' : 'إظهار'} كلمة المرور</span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
          {isLoading ? 'لحظات...' : 'إنشاء حساب'}
        </Button>
        <div className="text-center text-sm text-muted-foreground pt-4">
          عندك حساب؟{' '}
          <Link href="/login" className="text-primary hover:underline font-semibold">
            سجل دخول
          </Link>
        </div>
      </form>
    </Form>
  );
}
