
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const formSchema = z.object({
  email: z.string().email({ message: 'الرجاء إدخال إيميل صحيح.' }),
});

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email);
      if (error) throw error;
      setIsSubmitted(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'لم نتمكن من إرسال رابط إعادة التعيين. الرجاء التأكد من البريد الإلكتروني والمحاولة مرة أخرى.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-xl font-semibold">تم إرسال الرابط</h3>
        <p className="text-muted-foreground">
          لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. الرجاء التحقق من صندوق الوارد الخاص بك.
        </p>
        <Button variant="default" asChild>
          <Link href="/login">
            <ChevronRight className="ml-2 h-4 w-4" />
            العودة لصفحة تسجيل الدخول
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>البريد الإلكتروني المسجل</FormLabel>
              <FormControl>
                <Input type="email" placeholder="بريدك@example.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
          {isLoading ? 'لحظات...' : 'إرسال رابط إعادة التعيين'}
        </Button>
      </form>
    </Form>
  );
}
