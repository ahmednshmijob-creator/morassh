'use client';

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from '@/lib/supabase';
import type { Profile, Task } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/hooks/useUser";

const formSchema = z.object({
  title: z.string().min(5, "العنوان يجب أن يكون 5 أحرف على الأقل"),
  description: z.string().optional(),
  assigneeId: z.string({ required_error: "الرجاء إسناد المهمة لشخص." }),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTaskDialogProps {
  children: React.ReactNode;
  admins: Profile[];
  status: Task['status'];
  onTaskAdded: () => void;
}

export function AddTaskDialog({ children, admins, status, onTaskAdded }: AddTaskDialogProps) {
    const { user: currentUser } = useUser();
    const [open, setOpen] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { title: "", description: "", priority: 'medium' }
    });

    useEffect(() => {
      if (!open) {
        form.reset();
      }
    }, [open, form]);

    async function onSubmit(values: FormValues) {
        if (!currentUser) return;

        const assignee = admins.find(a => a.id === values.assigneeId);
        if (!assignee) {
            toast({ title: 'خطأ', description: 'المسؤول المحدد غير موجود', variant: 'destructive' });
            return;
        }

        startSaving(async () => {
            try {
                const { error } = await supabase.from('tasks').insert({
                    ...values,
                    status,
                    assigneeName: assignee.full_name,
                    assigneeAvatar: null,
                    createdBy: currentUser.uid,
                    createdAt: new Date().toISOString(),
                });
                if (error) throw error;
                toast({ title: 'تمت إضافة المهمة بنجاح' });
                onTaskAdded();
                setOpen(false);
            } catch (error: any) {
                toast({ title: 'خطأ', description: 'فشل إضافة المهمة', variant: 'destructive' });
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>إضافة مهمة جديدة</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>عنوان المهمة</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>الوصف (اختياري)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="assigneeId" render={({ field }) => (
                                <FormItem><FormLabel>إسناد إلى</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="اختر مسؤول..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {admins.map(admin => <SelectItem key={admin.id} value={admin.id}>{admin.full_name}</SelectItem>)}
                                        </SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="priority" render={({ field }) => (
                                <FormItem><FormLabel>الأولوية</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="low">منخفضة</SelectItem>
                                            <SelectItem value="medium">متوسطة</SelectItem>
                                            <SelectItem value="high">عالية</SelectItem>
                                        </SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                                إضافة المهمة
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
