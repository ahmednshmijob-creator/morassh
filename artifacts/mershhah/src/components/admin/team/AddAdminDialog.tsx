'use client';

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const permissions = [
  { id: 'dashboard', label: 'لوحة التحكم' },
  { id: 'management', label: 'إدارة المشتركين' },
  { id: 'financials', label: 'القسم المالي' },
  { id: 'store-management', label: 'إدارة المتجر' },
  { id: 'applications', label: 'التطبيقات' },
  { id: 'announcements', label: 'الإعلانات' },
  { id: 'support', label: 'الدعم المباشر' },
  { id: 'team', label: 'إدارة الفريق' },
  { id: 'workflow', label: 'سير العمل' },
  { id: 'sales', label: 'دليل المبيعات' },
];

const formSchema = z.object({
  fullName: z.string().min(2, { message: "الاسم الكامل مطلوب." }),
  email: z.string().email({ message: "الرجاء إدخال بريد إلكتروني صحيح." }),
  password: z.string().min(8, { message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." }),
  admin_permissions: z.array(z.string()).refine(value => value.length > 0, {
    message: "يجب أن تختار صلاحية واحدة على الأقل.",
  }),
});

interface AddAdminDialogProps {
    children: React.ReactNode;
    onAdminAdded: () => void;
}

export function AddAdminDialog({ children, onAdminAdded }: AddAdminDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { fullName: "", email: "", password: "", admin_permissions: [] },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        startTransition(async () => {
            try {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: values.email,
                    password: values.password,
                    options: {
                        data: {
                            full_name: values.fullName,
                        },
                    },
                });

                if (signUpError) throw signUpError;
                if (!data.user) throw new Error('فشل إنشاء الحساب.');

                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: data.user.id,
                    full_name: values.fullName,
                    email: values.email,
                    role: 'admin',
                    account_status: 'active',
                    created_at: new Date().toISOString(),
                    admin_permissions: values.admin_permissions,
                });

                if (profileError) throw profileError;

                toast({
                    title: "تمت إضافة المسؤول بنجاح",
                    description: `تم إنشاء حساب لـ ${values.fullName}.`,
                });

                onAdminAdded();
                setOpen(false);
                form.reset();

            } catch (error: any) {
                let description = error.message || "حدث خطأ غير متوقع.";
                if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
                    description = 'هذا البريد الإلكتروني مسجل بالفعل.';
                }
                toast({
                    variant: "destructive",
                    title: "خطأ في إضافة المسؤول",
                    description,
                });
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>إضافة مسؤول جديد</DialogTitle>
                            <DialogDescription>
                                أدخل بيانات المسؤول الجديد وحدد صلاحياته.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <FormField control={form.control} name="fullName" render={({ field }) => (
                                <FormItem><FormLabel>الاسم الكامل</FormLabel><FormControl><Input placeholder="الاسم" {...field} disabled={isPending} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input type="email" placeholder="admin@example.com" {...field} disabled={isPending} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem><FormLabel>كلمة المرور</FormLabel><FormControl><div className="relative"><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} disabled={isPending} /><Button type="button" variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" onClick={() => setShowPassword(prev => !prev)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div></FormControl><FormMessage /></FormItem>
                            )}/>

                            <Separator />

                            <FormField
                                control={form.control}
                                name="admin_permissions"
                                render={() => (
                                    <FormItem>
                                    <div className="mb-4">
                                        <FormLabel>صلاحيات المسؤول</FormLabel>
                                        <FormMessage />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {permissions.map((permission) => (
                                            <FormField
                                            key={permission.id}
                                            control={form.control}
                                            name="admin_permissions"
                                            render={({ field }) => {
                                                return (
                                                <FormItem key={permission.id} className="flex flex-row items-start space-x-3 space-y-0 space-x-reverse">
                                                    <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(permission.id)}
                                                        onCheckedChange={(checked) => {
                                                        const currentPermissions = field.value || [];
                                                        return checked
                                                            ? field.onChange([...currentPermissions, permission.id])
                                                            : field.onChange(currentPermissions.filter((value) => value !== permission.id));
                                                        }}
                                                    />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{permission.label}</FormLabel>
                                                </FormItem>
                                                )
                                            }}
                                            />
                                        ))}
                                    </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                             <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                إضافة مسؤول
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
