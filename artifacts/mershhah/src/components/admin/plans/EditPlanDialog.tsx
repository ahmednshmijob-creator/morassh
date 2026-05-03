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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Plan } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(3, 'اسم الباقة يجب أن يكون 3 أحرف على الأقل.'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'السعر يجب أن يكون 0 أو أكثر.'),
  duration_months: z.coerce.number().int().min(1, 'المدة يجب أن تكون شهرًا واحدًا على الأقل.'),
  payment_link: z
    .string()
    .url({ message: 'الرجاء إدخال رابط دفع صحيح.' })
    .optional()
    .or(z.literal('')),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  features_included: z.string().optional(),
  features_excluded: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPlanDialogProps {
  children?: React.ReactNode;
  plan?: Plan;
  onSave?: () => void;
}

export function EditPlanDialog({ children, plan, onSave }: EditPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();
  const isEditing = !!plan;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      duration_months: 1,
      payment_link: '',
      is_active: true,
      is_featured: false,
      features_included: '',
      features_excluded: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && plan) {
        const includedLines: string[] = [];
        const excludedLines: string[] = [];
        if (plan.features) {
          Object.entries(plan.features).forEach(([label, included]) => {
            if (!label.trim()) return;
            if (included) includedLines.push(label);
            else excludedLines.push(label);
          });
        }
        form.reset({
          name: plan.name,
          description: plan.description,
          price: plan.price,
          duration_months: plan.duration_months,
          payment_link: plan.payment_link || '',
          is_active: plan.is_active,
          is_featured: plan.is_featured,
          features_included: includedLines.join('\n'),
          features_excluded: excludedLines.join('\n'),
        });
      } else {
        form.reset({
          name: '', description: '', price: 0, duration_months: 1,
          payment_link: '', is_active: true, is_featured: false,
          features_included: '', features_excluded: '',
        });
      }
    }
  }, [open, plan, isEditing, form]);

  async function onSubmit(values: FormValues) {
    startSaving(async () => {
      try {
        const features: Record<string, boolean> = {};
        const addLines = (text: string | undefined, included: boolean) => {
          if (!text) return;
          text.split('\n').map((l) => l.trim()).filter(Boolean).forEach((l) => { features[l] = included; });
        };
        addLines(values.features_included, true);
        addLines(values.features_excluded, false);

        const { features_included, features_excluded, ...rest } = values;
        const payload: any = {
          ...rest,
          features: Object.keys(features).length > 0 ? features : undefined,
        };

        if (isEditing && plan) {
          const { error } = await supabase.from('plans').update(payload).eq('id', plan.id);
          if (error) throw error;
        } else {
          const newId = crypto.randomUUID();
          const { error } = await supabase.from('plans').insert({ id: newId, ...payload });
          if (error) throw error;
        }

        toast({ title: `تم ${isEditing ? 'تعديل' : 'إنشاء'} الباقة بنجاح` });
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل باقة' : 'إنشاء باقة جديدة'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>اسم الباقة</FormLabel><FormControl><Input placeholder="مثال: الباقة السنوية" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>الوصف (اختياري)</FormLabel><FormControl><Textarea placeholder="وصف قصير للباقة ومميزاتها." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="features_included" render={({ field }) => (
              <FormItem>
                <FormLabel>المميزات المشمولة في هذه الباقة</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder={"اكتب كل ميزة في سطر مستقل، مثلاً:\nمساعد ذكي للعملاء\nتحليلات متقدمة للتقييمات"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="features_excluded" render={({ field }) => (
              <FormItem>
                <FormLabel>مميزات غير مشمولة (تظهر بخط مشطوب)</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder={"مثال:\nمدير علاقات مخصص\nدعم فني 24/7"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>السعر (ر.س)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="duration_months" render={({ field }) => (
                <FormItem><FormLabel>المدة (بالأشهر)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="payment_link" render={({ field }) => (
              <FormItem><FormLabel>رابط الدفع (اختياري)</FormLabel><FormControl><Input dir="ltr" placeholder="https://..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5"><FormLabel>نشطة؟</FormLabel><FormMessage /></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="is_featured" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5"><FormLabel>موصى بها؟</FormLabel><FormMessage /></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : isEditing ? 'حفظ التعديلات' : 'إنشاء باقة'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
