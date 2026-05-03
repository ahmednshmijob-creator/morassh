'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/lib/types';

const formSchema = z.object({
  title: z.string().min(5, 'العنوان مطلوب (5 أحرف على الأقل)'),
  content: z.string().min(10, 'محتوى الإعلان مطلوب (10 أحرف على الأقل)'),
  type: z.enum(['info', 'warning', 'success', 'update']),
  targetRole: z.enum(['owner', 'all']),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface EditAnnouncementDialogProps {
  children?: React.ReactNode;
  announcement?: Announcement;
  onSave?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditAnnouncementDialog({
  children,
  announcement,
  onSave,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: EditAnnouncementDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();
  const isEditing = !!announcement;

  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', content: '', type: 'info', targetRole: 'owner', isActive: true },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        isEditing
          ? announcement
          : { title: '', content: '', type: 'info', targetRole: 'owner', isActive: true }
      );
    }
  }, [open, announcement, isEditing, form]);

  async function onSubmit(values: FormValues) {
    startSaving(async () => {
      try {
        if (isEditing) {
          const { error } = await supabase
            .from('announcements')
            .update(values)
            .eq('id', announcement.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('announcements').insert({
            id: crypto.randomUUID(),
            ...values,
            createdAt: new Date().toISOString(),
          });
          if (error) throw error;
        }
        toast({ title: `تم ${isEditing ? 'تعديل' : 'إنشاء'} الإعلان بنجاح` });
        onSave?.();
        setOpen(false);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'حدث خطأ', description: error.message });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل إعلان' : 'إنشاء إعلان جديد'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>عنوان الإعلان</FormLabel><FormControl><Input placeholder="مثال: تحديث جديد للمنصة" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem><FormLabel>محتوى الإعلان</FormLabel><FormControl><Textarea placeholder="اشرح تفاصيل الإعلان هنا..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>نوع الإعلان</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="info">معلومات</SelectItem><SelectItem value="warning">تحذير</SelectItem><SelectItem value="success">نجاح</SelectItem><SelectItem value="update">تحديث</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="targetRole" render={({ field }) => (
                <FormItem><FormLabel>الجمهور المستهدف</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="owner">أصحاب المطاعم</SelectItem><SelectItem value="all">الكل</SelectItem></SelectContent></Select><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5"><FormLabel>تفعيل الإعلان</FormLabel><FormMessage /></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : isEditing ? 'حفظ التعديلات' : 'إنشاء إعلان'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
