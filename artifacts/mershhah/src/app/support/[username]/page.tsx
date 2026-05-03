'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'wouter';
import { supabase } from '@/lib/supabase';
import { getPublicPage } from '@/lib/public-pages';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ChevronRight, CheckCircle, LifeBuoy, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { StorageImage } from '@/components/shared/StorageImage';
import { Skeleton } from '@/components/ui/skeleton';

const ticketSchema = z.object({
  name: z.string().min(3, { message: 'الاسم مطلوب.' }),
  email: z.string().email({ message: 'بريد إلكتروني غير صالح.' }),
  subject: z.string().min(5, { message: 'الموضوع مطلوب.' }),
  message: z.string().min(10, { message: 'الرسالة يجب أن تكون 10 أحرف على الأقل.' }),
});

export default function SupportPage() {
  const params = useParams();
  const username = params.username as string;
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, startSubmitting] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      try {
        const data = await getPublicPage(username);
        if (data?.restaurant) {
          setRestaurant(data.restaurant);
          setLoading(false);
          return;
        }
        const { data: rest } = await supabase
          .from('restaurants')
          .select('*')
          .eq('username', username)
          .limit(1)
          .single();
        setRestaurant(rest || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  const onSubmit = (values: z.infer<typeof ticketSchema>) => {
    if (!restaurant) return;
    startSubmitting(async () => {
      try {
        const { error } = await supabase.from('support_tickets').insert({
          ...values,
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          status: 'open',
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
        setSubmitted(true);
      } catch (error: any) {
        toast({
          title: 'حدث خطأ',
          description: 'لم نتمكن من إرسال تذكرتك. الرجاء المحاولة مرة أخرى.',
          variant: 'destructive',
        });
      }
    });
  };

  const primaryColor = restaurant?.primaryColor || '#714dfa';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]" dir="rtl">
        <div className="h-24 w-full bg-gray-100 animate-pulse" />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-24 w-24 rounded-2xl mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 text-center p-6" dir="rtl">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
          <Info className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black text-right mt-4">المطعم غير موجود!</h1>
        <Button asChild className="w-full max-w-xs mt-6 h-12 rounded-2xl font-bold">
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] pb-12 overflow-x-hidden" dir="rtl">
      <div className="bg-white border-b px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center text-center relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 rounded-2xl bg-muted/50 text-foreground hover:bg-muted"
          asChild
        >
          <Link href={`/hub/${username}`}>
            <ChevronRight className="h-6 w-6" />
          </Link>
        </Button>

        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shadow-lg overflow-hidden">
          <StorageImage
            imagePath={restaurant.logo}
            alt={restaurant.name}
            fill
            sizes="96px"
            className="object-cover"
          />
          <AvatarFallback className="rounded-2xl">{restaurant.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="space-y-1 mt-4">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">{restaurant.name}</h1>
          <p className="text-sm text-muted-foreground font-medium">الدعم الفني</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {submitted ? (
            <div className="p-8 sm:p-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">تم إرسال رسالتك بنجاح!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                شكراً لتواصلك معنا. تم استلام رسالتك وسيتم مراجعتها من قبل إدارة المطعم.
              </p>
              <Button asChild className="h-12 rounded-2xl font-bold" style={{ backgroundColor: primaryColor }}>
                <Link href={`/hub/${username}`}>العودة لصفحة المطعم</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-100 px-4 sm:px-6 py-5">
                <div className="flex items-center gap-3 text-right">
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <LifeBuoy className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">إنشاء تذكرة دعم</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      املأ النموذج وسيتم إرسال رسالتك إلى إدارة المطعم لمراجعتها.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 text-right">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الاسم</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="اسمك الكامل" className="rounded-xl" />
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
                            <FormLabel>البريد الإلكتروني</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="بريدك@example.com" className="rounded-xl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الموضوع</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="عنوان المشكلة أو الاستفسار" className="rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الرسالة</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="اشرح مشكلتك أو استفسارك بالتفصيل..."
                              rows={5}
                              className="rounded-xl resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-2xl font-bold"
                      style={{ backgroundColor: primaryColor }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      إرسال التذكرة
                    </Button>
                  </form>
                </Form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
