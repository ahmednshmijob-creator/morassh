'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { syncPublicPage } from '@/lib/public-pages';
import saGeodata from '@/data/sa-geodata.json';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Branch } from '@/lib/types';

const schema = z.object({
  name: z.string().min(2, 'اسم الفرع مطلوب'),
  city: z.string().min(2, 'اختر المدينة'),
  district: z.string().min(2, 'اختر الحي'),
  address: z.string().min(5, 'العنوان مطلوب'),
  phone: z.string().optional(),
  opening_hours: z.string().max(200).optional(),
  status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof schema>;

const cities = Object.keys(saGeodata) as string[];

interface EditBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch | null;
  restaurantId: string;
  onSaved?: () => void;
}

export function EditBranchDialog({
  open,
  onOpenChange,
  branch,
  restaurantId,
  onSaved,
}: EditBranchDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(branch?.id);
  const [allDaysOpen, setAllDaysOpen] = useState('');
  const [allDaysClose, setAllDaysClose] = useState('');
  const [fridayOpen, setFridayOpen] = useState('');
  const [fridayClose, setFridayClose] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      city: '',
      district: '',
      address: '',
      phone: '',
      opening_hours: '',
      status: 'active',
    },
  });

  const city = form.watch('city');
  const districts = (saGeodata as Record<string, string[]>)[city] ?? [];

  useEffect(() => {
    if (!open) return;
    if (branch) {
      form.reset({
        name: branch.name,
        city: branch.city,
        district: branch.district,
        address: branch.address,
        phone: branch.phone ?? '',
        opening_hours: branch.opening_hours ?? '',
        status: branch.status ?? 'active',
      });
      setAllDaysOpen('');
      setAllDaysClose('');
      setFridayOpen('');
      setFridayClose('');
    } else {
      form.reset({ name: '', city: '', district: '', address: '', phone: '', opening_hours: '', status: 'active' });
      setAllDaysOpen('');
      setAllDaysClose('');
      setFridayOpen('');
      setFridayClose('');
    }
  }, [open, branch, form]);

  useEffect(() => {
    if (!city) form.setValue('district', '');
  }, [city, form]);

  async function onSubmit(values: FormValues) {
    if (!restaurantId) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        name: values.name,
        city: values.city,
        district: values.district,
        address: values.address,
        status: values.status,
        restaurant_id: restaurantId,
      };
      if (values.phone?.trim()) data.phone = values.phone.trim();
      if (values.opening_hours?.trim()) data.opening_hours = values.opening_hours.trim();

      if (isEdit && branch?.id) {
        const { error } = await supabase.from('branches').update(data).eq('id', branch.id);
        if (error) throw error;
        toast({ title: 'تم تحديث الفرع' });
      } else {
        const { error } = await supabase
          .from('branches')
          .insert({ id: crypto.randomUUID(), ...data });
        if (error) throw error;
        toast({ title: 'تمت إضافة الفرع' });
      }

      syncPublicPage(restaurantId).catch(() => {});
      onSaved?.();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'خطأ', description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل الفرع' : 'إضافة فرع جديد'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'عدّل البيانات ثم احفظ.' : 'أدخل بيانات الفرع.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم الفرع</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: فرع العليا" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المدينة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المدينة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحي</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!city || districts.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحي" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {districts.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان</FormLabel>
                  <FormControl>
                    <Input placeholder="الشارع والحي..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الهاتف (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="05xxxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2 rounded-md border px-3 py-2">
              <p className="text-sm font-medium">أوقات العمل (اختياري)</p>
              <p className="text-xs text-muted-foreground">
                اختر الأوقات وسيتم توليد النص تلقائياً. يمكن تعديل النص يدوياً إذا رغبت.
              </p>
              <div className="space-y-2">
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-sm font-medium">كل الأيام</span>
                  <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <Input
                      type="time"
                      value={allDaysOpen}
                      onChange={(e) => {
                        const next = e.target.value;
                        setAllDaysOpen(next);
                        const close = allDaysClose;
                        const friO = fridayOpen;
                        const friC = fridayClose;
                        let text = '';
                        if (next && close) {
                          text = `يوميًا ${next} - ${close}`;
                          if (friO && friC) text += ` (الجمعة ${friO} - ${friC})`;
                        }
                        form.setValue('opening_hours', text, { shouldDirty: true });
                      }}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground text-center">إلى</span>
                    <Input
                      type="time"
                      value={allDaysClose}
                      onChange={(e) => {
                        const next = e.target.value;
                        setAllDaysClose(next);
                        const open = allDaysOpen;
                        const friO = fridayOpen;
                        const friC = fridayClose;
                        let text = '';
                        if (open && next) {
                          text = `يوميًا ${open} - ${next}`;
                          if (friO && friC) text += ` (الجمعة ${friO} - ${friC})`;
                        }
                        form.setValue('opening_hours', text, { shouldDirty: true });
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <span className="text-sm font-medium">الجمعة (اختياري)</span>
                  <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <Input
                      type="time"
                      value={fridayOpen}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFridayOpen(next);
                        const allO = allDaysOpen;
                        const allC = allDaysClose;
                        const friC = fridayClose;
                        let text = '';
                        if (allO && allC) {
                          text = `يوميًا ${allO} - ${allC}`;
                          if (next && friC) text += ` (الجمعة ${next} - ${friC})`;
                        }
                        form.setValue('opening_hours', text, { shouldDirty: true });
                      }}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground text-center">إلى</span>
                    <Input
                      type="time"
                      value={fridayClose}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFridayClose(next);
                        const allO = allDaysOpen;
                        const allC = allDaysClose;
                        const friO = fridayOpen;
                        let text = '';
                        if (allO && allC) {
                          text = `يوميًا ${allO} - ${allC}`;
                          if (friO && next) text += ` (الجمعة ${friO} - ${next})`;
                        }
                        form.setValue('opening_hours', text, { shouldDirty: true });
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <FormField
                control={form.control}
                name="opening_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">ملخص أوقات العمل</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="مثال: يوميًا 10:00 - 23:00 (الجمعة 14:00 - 23:00)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحالة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="inactive">غير نشط</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ' : 'إضافة'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
