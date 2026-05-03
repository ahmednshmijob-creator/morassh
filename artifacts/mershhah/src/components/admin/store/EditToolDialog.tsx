'use client';

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Code2, Copy, Sparkles, ChevronsUpDown, Check } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Separator } from "@/components/ui/separator";
import { generateToolIdeas } from "@/ai/flows/generate-tool-ideas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { StorageImage } from "@/components/shared/StorageImage";
import type { Tool } from "@/lib/types";

const formSchema = z.object({
  id: z.string().min(3, "المعرّف يجب أن يكون 3 أحرف على الأقل.").regex(/^[a-z0-9-]+$/, "استخدم حروف إنجليزية صغيرة وأرقام وشرطات فقط."),
  title: z.string().min(2, "العنوان مطلوب"),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
  category: z.string().min(1, "الرجاء اختيار أو إدخال تصنيف."),
  price_label: z.string().min(1, "بطاقة السعر مطلوبة (مثال: 'مجاني' أو '50 ر.س')."),
  icon: z.string().min(1, "الأيقونة مطلوبة (اسم أيقونة من Lucide)"),
  color: z.string().regex(/^text-/, "يجب أن يبدأ بـ 'text-'"),
  bg_color: z.string().regex(/^bg-/, "يجب أن يبدأ بـ 'bg-'"),
  popular: z.boolean().default(false),
  billing_type: z.enum(["plan", "addon"]).default("plan"),
  period_months: z.coerce.number().int().min(1, "المدة يجب أن تكون شهراً واحداً على الأقل.").nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditToolDialogProps {
  children: React.ReactNode;
  tool?: Tool;
  allTools?: any[];
  onSave?: () => void;
}

const iconList = ['MessageCircle', 'Star', 'Truck', 'BarChart3', 'Megaphone', 'Box', 'KeyRound', 'Clock', 'Info', 'Calculator', 'FileText', 'Wrench', 'BrainCircuit', 'HeartPulse', 'ThumbsUp', 'Sparkles', 'CalendarDays'];
const colorList = [
    { name: 'أزرق', value: 'blue-500' },
    { name: 'أخضر', value: 'green-500' },
    { name: 'برتقالي', value: 'orange-500' },
    { name: 'بنفسجي', value: 'violet-500' },
    { name: 'وردي', value: 'pink-500' },
    { name: 'أساسي', value: 'primary' },
];

export function EditToolDialog({ children, tool, allTools = [], onSave }: EditToolDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isGenerating, startGeneratingIdea] = useTransition();
  const { toast } = useToast();
  const isEditing = !!tool;

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(tool?.image_path || null);
  const [localImageFile, setLocalImageFile] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const toolId = form.watch('id');
  const selectedCategory = form.watch('category');

  const uniqueCategories = useMemo(() => {
    if (!allTools) return ['marketing', 'operations', 'analytics'];
    const existing = allTools.map(t => t.category).filter(Boolean);
    const defaults = ['marketing', 'operations', 'analytics'];
    return [...new Set([...defaults, ...existing])];
  }, [allTools]);

  useEffect(() => {
    if (open) {
      form.reset(isEditing ? {
        ...tool,
        id: tool.id,
        billing_type: tool.billing_type || "plan",
        period_months: tool.period_months ?? (tool.billing_type === "addon" ? 1 : null),
      } : {
        id: "",
        title: "",
        description: "",
        category: "",
        price_label: "مجاني",
        icon: "Box",
        color: "text-primary",
        bg_color: "bg-primary/10",
        popular: false,
        billing_type: "plan",
        period_months: null,
      });
      setPreviewImage(tool?.image_path || null);
      setLocalImageFile(null);
    }
  }, [open, tool, isEditing, form]);

  const handleGenerateToolIdea = () => {
    if (!selectedCategory) {
        toast({ title: "الرجاء اختيار تصنيف أولاً", variant: "destructive" });
        return;
    }
    startGeneratingIdea(async () => {
        try {
            const result = await generateToolIdeas({
                restaurantType: selectedCategory,
                currentTools: allTools.map(t => t.title),
            });
            if (result.ideas && result.ideas.length > 0) {
                form.setValue('description', result.ideas[0], { shouldValidate: true });
                toast({ title: "تم إنشاء فكرة أداة جديدة!", description: "تم تعبئة حقل الوصف بالفكرة المقترحة." });
            }
        } catch (error: any) {
            toast({ title: "فشل إنشاء الفكرة", description: error.message, variant: "destructive" });
        }
    });
  };

  const handleImportFromFile = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result?.toString() || '';
        const parsed = JSON.parse(text);
        const result = formSchema.safeParse(parsed);
        if (!result.success) {
          toast({ variant: "destructive", title: "ملف غير صالح", description: "تأكد أن الملف يحتوي على حقول الأداة الأساسية." });
          return;
        }
        const values = result.data;
        form.reset({
          id: isEditing ? tool!.id : values.id,
          title: values.title,
          description: values.description,
          category: values.category,
          price_label: values.price_label,
          icon: values.icon,
          color: values.color,
          bg_color: values.bg_color,
          popular: values.popular ?? false,
        });
        toast({ title: "تم استيراد تعريف الأداة بنجاح" });
      } catch (error: any) {
        toast({ variant: "destructive", title: "فشل قراءة الملف", description: "تأكد أن الملف بصيغة JSON صحيحة." });
      }
    };
    reader.readAsText(file, "utf-8");
  };

  async function onSubmit(values: FormValues) {
    startSaving(async () => {
        try {
            let imagePath: string | null | undefined = tool?.image_path || null;

            if (localImageFile) {
              const fileExt = localImageFile.name.split('.').pop();
              const safeId = isEditing ? tool!.id : values.id;
              const fileName = `tools/${safeId}/${safeId}.${fileExt}`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('restaurant-assets')
                  .upload(fileName, localImageFile, { upsert: true });
              if (uploadError) throw uploadError;
              imagePath = uploadData.path;
            }

            const dataToSave: any = {
              ...values,
              type: 'free',
              image_path: imagePath ?? null,
            };

            if (isEditing) {
              const { id, ...updateData } = dataToSave;
              const { error } = await supabase.from('tools').update(updateData).eq('id', tool!.id);
              if (error) throw error;
            } else {
              const { data: existing } = await supabase.from('tools').select('id').eq('id', values.id).single();
              if (existing) {
                toast({ variant: "destructive", title: "المعرف مستخدم بالفعل", description: "هذا المعرف مستخدم من قبل أداة أخرى. الرجاء اختيار معرف فريد." });
                return;
              }
              const { error } = await supabase.from('tools').insert(dataToSave);
              if (error) throw error;
            }

            toast({ title: `تم ${isEditing ? 'تعديل' : 'إضافة'} الأداة بنجاح` });
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
              <div>
                <DialogTitle>{isEditing ? 'تعديل أداة' : 'إضافة أداة جديدة'}</DialogTitle>
                <DialogDescription>
                    {isEditing ? 'قم بتعديل تفاصيل الأداة أدناه.' : 'أدخل تفاصيل الأداة الجديدة أو استخدم الذكاء الاصطناعي لاقتراح فكرة.'}
                </DialogDescription>
              </div>
              {!isEditing && (
                <div className="flex gap-2 flex-row-reverse">
                  <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={handleGenerateToolIdea} disabled={isGenerating || !selectedCategory}>
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    اقترح فكرة
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="gap-1 shrink-0 flex-row-reverse" onClick={handleImportFromFile}>
                    <Code2 className="h-4 w-4" />
                    استيراد من ملف
                  </Button>
                  <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChange} className="hidden" />
                </div>
              )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6 items-start">
              <div className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>عنوان الأداة</FormLabel><FormControl><Input placeholder="مثال: تحليلات متقدمة" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="id" render={({ field }) => (
                  <FormItem><FormLabel>المعرّف البرمجي</FormLabel><FormControl><Input placeholder="اداة-جديدة" {...field} disabled={isEditing} /></FormControl><FormMessage /><p className="text-xs text-muted-foreground pt-1">المعرّف البرمجي للأداة. لا يمكن تغييره بعد الإنشاء.</p></FormItem>
                )}/>
              </div>
              <div className="space-y-2">
                <FormLabel>صورة الأداة (اختياري)</FormLabel>
                <div
                  className="relative w-24 h-24 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-muted/50 bg-muted/10 overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewImage ? (
                    <StorageImage imagePath={previewImage} alt={form.getValues('title') || 'صورة الأداة'} fill className="object-contain p-2" sizes="96px" />
                  ) : (
                    <span className="text-xs text-muted-foreground text-center px-2">اضغط لرفع صورة للأداة</span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024) {
                      toast({ variant: "destructive", title: "حجم الصورة كبير", description: "الرجاء اختيار صورة بحجم أقل من 1 ميجابايت." });
                      return;
                    }
                    setLocalImageFile(file);
                    setPreviewImage(URL.createObjectURL(file));
                  }}
                  className="hidden"
                />
                <p className="text-[11px] text-muted-foreground">يفضّل استخدام شعار مربع (1:1)، بصيغة PNG أو WEBP، وحجم أقل من 1 ميجابايت.</p>
              </div>
            </div>

            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>التصنيف</FormLabel>
                    <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                    {field.value ? uniqueCategories.find(c => c === field.value) || field.value : "اختر أو أنشئ تصنيف..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                <CommandInput placeholder="ابحث أو اكتب تصنيف جديد..." onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value) { e.preventDefault(); form.setValue('category', e.currentTarget.value); setCategoriesOpen(false); } }} />
                                <CommandList>
                                    <CommandEmpty><p className="p-2 text-sm text-muted-foreground">اكتب اسماً واضغط Enter للإضافة.</p></CommandEmpty>
                                    <CommandGroup>
                                        {uniqueCategories.map((category) => (
                                            <CommandItem value={category} key={category} onSelect={() => { form.setValue("category", category); setCategoriesOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", category === field.value ? "opacity-100" : "opacity-0")} />
                                                {category}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="billing_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>طريقة صلاحية الأداة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر طريقة الصلاحية" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="plan">مع اشتراك مرشح الأساسي</SelectItem>
                      <SelectItem value="addon">اشتراك مستقل (مدة خاصة للأداة)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="period_months" render={({ field }) => (
                <FormItem>
                  <FormLabel>مدة الأداة (بالأشهر)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="مثال: 1 أو 3 أو 12" {...field} value={field.value ?? ''} disabled={form.watch('billing_type') !== 'addon'} />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">تُستخدم فقط إذا كانت الأداة باشتراك مستقل.</p>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>الوصف</FormLabel><FormControl><Textarea placeholder="وصف قصير وجذاب للأداة..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="price_label" render={({ field }) => (
                    <FormItem><FormLabel>بطاقة السعر</FormLabel><FormControl><Input placeholder="مجاني أو 50 ر.س" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="icon" render={({ field }) => (
                    <FormItem><FormLabel>الأيقونة</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر أيقونة..." /></SelectTrigger></FormControl><SelectContent>{iconList.map(i=><SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="color" render={({ field }) => (
                    <FormItem><FormLabel>لون الأيقونة</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر لون..." /></SelectTrigger></FormControl><SelectContent>{colorList.map(c=><SelectItem key={c.value} value={`text-${c.value}`}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="bg_color" render={({ field }) => (
                    <FormItem><FormLabel>لون الخلفية</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر لون..." /></SelectTrigger></FormControl><SelectContent>{colorList.map(c=><SelectItem key={c.value} value={`bg-${c.value}/10`}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )}/>
            </div>
            <FormField control={form.control} name="popular" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5"><FormLabel>أداة شائعة؟</FormLabel><FormMessage /></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
            )}/>

            <Separator className="my-4" />

            <div className="space-y-2 pt-4">
              <h4 className="font-bold text-md flex items-center gap-2"><Code2 className="h-5 w-5" />معلومات للمطور</h4>
              <p className="text-sm text-muted-foreground">لإضافة واجهة المستخدم لهذه الأداة، أنشئ ملف React في المسار التالي.</p>
              <div className="relative">
                <Input readOnly value={toolId ? `src/app/owner/tools/${toolId}/page.tsx` : "src/app/owner/tools/.../page.tsx"} className="font-mono text-xs bg-muted text-muted-foreground pr-10 text-left" dir="ltr" />
                <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => { navigator.clipboard.writeText(`src/app/owner/tools/${toolId}/page.tsx`); toast({ title: "تم نسخ المسار" }); }} disabled={!toolId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : (isEditing ? "حفظ التعديلات" : "إضافة الأداة")}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
