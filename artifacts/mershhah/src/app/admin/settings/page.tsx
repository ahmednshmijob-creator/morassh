'use client';

import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, KeyRound } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const profileFormSchema = z.object({
  full_name: z.string().min(3, { message: 'الاسم يجب أن يكون 3 أحرف على الأقل.' }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function SettingsPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const [isSaving, startSaving] = useTransition();
    const [isSendingReset, startSendingReset] = useTransition();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            full_name: '',
        },
    });

    useEffect(() => {
        if (user) {
            form.reset({
                full_name: user.full_name || '',
            });
        }
    }, [user, form]);

    const handleProfileUpdate = async (data: ProfileFormValues) => {
        if (!user) return;
        startSaving(async () => {
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({ full_name: data.full_name })
                    .eq('id', user.uid);
                if (error) throw error;
                toast({ title: 'تم تحديث ملفك الشخصي بنجاح!' });
            } catch (error: any) {
                toast({
                    title: 'خطأ',
                    description: 'فشل تحديث الملف الشخصي: ' + error.message,
                    variant: 'destructive',
                });
            }
        });
    };

    const handlePasswordReset = () => {
        if (!user?.email) return;
        startSendingReset(async () => {
            try {
                const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                if (error) throw error;
                toast({
                    title: 'تم إرسال الرابط',
                    description: 'لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.',
                });
            } catch (error: any) {
                toast({
                    title: 'خطأ',
                    description: 'فشل إرسال رابط إعادة التعيين: ' + error.message,
                    variant: 'destructive',
                });
            }
        });
    };

    if (isUserLoading) {
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-auto p-4 lg:p-6">
          <PageHeader title="الإعدادات" description="إدارة إعدادات حسابك وتفضيلات المنصة." />
          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-24" />
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                 <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-auto p-4 lg:p-6">
            <PageHeader
                title="الإعدادات"
                description="إدارة إعدادات حسابك الشخصي والأمان."
            />

            <div className="grid md:grid-cols-2 gap-8 items-start">
                <Card>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleProfileUpdate)}>
                            <CardHeader>
                                <CardTitle>الملف الشخصي</CardTitle>
                                <CardDescription>
                                    هذه هي معلوماتك الشخصية التي تظهر في المنصة.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                 <FormField
                                    control={form.control}
                                    name="full_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الاسم الكامل</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-2">
                                    <Label>البريد الإلكتروني</Label>
                                    <Input value={user?.email || ''} disabled />
                                    <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني بعد التسجيل.</p>
                                </div>
                            </CardContent>
                            <CardFooter className="border-t px-6 py-4">
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                    حفظ التغييرات
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>الأمان وكلمة المرور</CardTitle>
                        <CardDescription>
                            لأمان حسابك، قم بتغيير كلمة المرور بشكل دوري.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={handlePasswordReset} disabled={isSendingReset} className="w-full">
                            {isSendingReset && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                             <KeyRound className="ml-2 h-4 w-4" />
                            إرسال رابط تغيير كلمة المرور
                        </Button>
                         <p className="text-xs text-muted-foreground mt-2 text-center">سيتم إرسال رابط إلى بريدك الإلكتروني المسجل.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
