'use client';

import { useState, useTransition, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Application } from "@/lib/types";
import { StorageImage } from "@/components/shared/StorageImage";

const formSchema = z.object({
  name: z.string().min(2, "اسم التطبيق مطلوب"),
  platform_id: z.string().min(3, "المعرّف مطلوب (3 أحرف على الأقل)").regex(/^[a-z0-9_]+$/, "استخدم حروف إنجليزية صغيرة وأرقام وشرطة سفلية فقط."),
  category: z.enum(['delivery', 'loyalty', 'payment', 'other']),
  logo_url: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditApplicationDialogProps {
  children: React.ReactNode;
  application?: Application;
  onSave?: () => void;
}

export function EditApplicationDialog({ children, application, onSave }: EditApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();
  const isEditing = !!application;

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset(isEditing ? application : {
        name: "",
        platform_id: "",
        category: 'delivery',
        logo_url: null,
      });
      setLogoFile(null);
      setLogoPreview(isEditing ? application.logo_url : null);
    }
  }, [open, application, isEditing, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1 * 1024 * 1024) {
            toast({ title: "حجم الصورة كبير", description: "الرجاء اختيار صورة بحجم أقل من 1 ميجابايت.", variant: "destructive" });
            return;
       }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  async function onSubmit(values: FormValues) {
    if (!logoFile && !isEditing) {
        toast({ title: "شعار التطبيق مطلوب", variant: "destructive" });
        return;
    }

    startSaving(async () => {
        try {
            let finalLogoUrl = isEditing ? application.logo_url : '';
            if (logoFile) {
                const fileExtension = logoFile.name.split('.').pop();
                const newFileName = `application_logos/${values.platform_id}.${fileExtension}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('restaurant-assets')
                    .upload(newFileName, logoFile, { upsert: true });
                if (uploadError) throw uploadError;
                finalLogoUrl = uploadData.path;
            }

            const appData = {
                id: values.platform_id,
                ...values,
                logo_url: finalLogoUrl,
            };

            const { error } = await supabase
                .from('applications')
                .upsert(appData, { onConflict: 'id' });
            if (error) throw error;

            toast({ title: `تم ${isEditing ? 'تعديل' : 'إضافة'} التطبيق بنجاح` });
            onSave?.();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "حدث خطأ", description: error.message });
        }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل تطبيق' : 'إضافة تطبيق جديد'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'قم بتعديل تفاصيل التطبيق أدناه.' : 'أدخل تفاصيل التطبيق الجديد ليظهر في قائمة التطبيقات المتاحة للمطاعم.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="flex items-start gap-4">
                <div className="space-y-2 flex-1">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>اسم التطبيق</FormLabel><FormControl><Input placeholder="مثال: جاهز" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="platform_id" render={({ field }) => (
                        <FormItem><FormLabel>المعرّف</FormLabel><FormControl><Input placeholder="jahez" {...field} disabled={isEditing} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <div className="space-y-2">
                    <FormLabel>شعار التطبيق</FormLabel>
                    <div
                        className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {logoPreview ? <StorageImage imagePath={logoPreview} alt="logo" height={80} width={80} className="object-contain" /> : <UploadCloud className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                </div>
            </div>

            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>تصنيف التطبيق</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="delivery">توصيل</SelectItem><SelectItem value="loyalty">ولاء</SelectItem><SelectItem value="payment">دفع</SelectItem><SelectItem value="other">أخرى</SelectItem></SelectContent></Select><FormMessage/></FormItem>
            )}/>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : (isEditing ? "حفظ التعديلات" : "إضافة التطبيق")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
