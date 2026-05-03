'use client';

import React, { useState, useTransition, useRef, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Sparkles, ChevronsUpDown, Check, UploadCloud } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '../ui/table';
import { supabase } from '@/lib/supabase';
import { StorageImage } from '@/components/shared/StorageImage';
import { generateMenuDescriptions } from '@/ai/flows/generate-menu-descriptions';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import type { MenuItem } from '@/lib/types';
import { syncPublicPage } from '@/lib/public-pages';
import { useLanguage } from '@/components/shared/LanguageContext';

const BUCKET = 'restaurant-assets';

const sizeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'اسم الحجم مطلوب'),
  price: z.coerce.number().min(0, 'السعر مطلوب'),
  cost: z.coerce.number().min(0, 'التكلفة مطلوبة'),
  calories: z.coerce.number().optional(),
});

const formSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  description: z.string().min(10, 'الوصف يجب أن يكون 10 أحرف على الأقل'),
  image_url: z.string().optional().or(z.literal('')),
  category: z.string().min(2, 'اسم الصنف مطلوب'),
  sizes: z.array(sizeSchema).min(1, 'يجب إضافة حجم واحد على الأقل.'),
  status: z.enum(['available', 'unavailable']).default('available'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditMenuItemDialogProps {
  children: React.ReactNode;
  menuItem?: any;
  menuItems?: MenuItem[];
  onSave?: () => void;
  restaurantId?: string | null;
  userId?: string | null;
  itemCount?: number;
}

const isToday = (someDate?: Date) => {
  if (!someDate) return false;
  const today = new Date();
  return (
    someDate.getDate() === today.getDate() &&
    someDate.getMonth() === today.getMonth() &&
    someDate.getFullYear() === today.getFullYear()
  );
};

export function EditMenuItemDialog({
  children,
  menuItem,
  menuItems,
  onSave,
  restaurantId,
  userId,
  itemCount = 0,
}: EditMenuItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isGeneratingDesc, startGeneratingDesc] = useTransition();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [descriptionWasGenerated, setDescriptionWasGenerated] = useState(false);
  const { toast } = useToast();
  const { isRTL } = useLanguage();
  const isEditing = !!menuItem;

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const iconMargin = 'ml-2';
  const dir = 'rtl';

  const uniqueCategories = useMemo(() => {
    if (!menuItems) return [];
    return [...new Set(menuItems.map((item) => item.category).filter(Boolean))];
  }, [menuItems]);

  useEffect(() => {
    if (open) {
      const defaultSizes = [{ id: `size-${Date.now()}`, name: 'عادي', price: 0, cost: 0, calories: 0 }];
      const sizes =
        menuItem?.sizes && Array.isArray(menuItem.sizes) && menuItem.sizes.length > 0
          ? menuItem.sizes.map((s: any) => ({ ...s, id: s.id || `size-${Math.random()}`, cost: s.cost || 0 }))
          : defaultSizes;

      form.reset(
        isEditing
          ? {
              name: menuItem.name,
              description: menuItem.description || '',
              category: menuItem.category || '',
              image_url: menuItem.image_url || '',
              sizes,
              status: menuItem.status || 'available',
            }
          : { name: '', description: '', category: '', image_url: '', sizes: defaultSizes, status: 'available' }
      );
      setImageFile(null);
      setImagePreview(menuItem?.image_url || null);
      setDescriptionWasGenerated(false);
    }
  }, [open, menuItem, isEditing, form]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'sizes' });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 4 * 1024 * 1024) {
        toast({ title: 'حجم الصورة كبير', description: 'الرجاء اختيار صورة أقل من 4 ميجابايت.', variant: 'destructive' });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerateDescription = async () => {
    const itemName = form.getValues('name');
    if (!itemName) {
      toast({ title: 'الرجاء إدخال اسم الطبق أولاً', variant: 'destructive' });
      return;
    }

    if (isEditing && menuItem?.id) {
      const { data: itemData } = await supabase
        .from('menu_items')
        .select('description_last_generated_at')
        .eq('id', menuItem.id)
        .single();
      if (itemData?.description_last_generated_at) {
        const lastGen = new Date(itemData.description_last_generated_at);
        if (isToday(lastGen)) {
          toast({
            title: 'لقد وصلت للحد اليومي',
            description: 'يمكنك إنشاء وصف واحد لهذا الطبق كل يوم.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    startGeneratingDesc(async () => {
      try {
        const result = await generateMenuDescriptions({
          items: [{ name: itemName, category: form.getValues('category') }],
        });
        const generatedDescription = result.items?.[0]?.description ?? '';
        form.setValue('description', generatedDescription, { shouldValidate: true });
        setDescriptionWasGenerated(true);
        toast({ title: 'تم إنشاء الوصف بنجاح!' });
      } catch (e: any) {
        toast({ title: 'فشل إنشاء الوصف', description: e.message, variant: 'destructive' });
      }
    });
  };

  async function onSubmit(values: FormValues) {
    if (!restaurantId || !userId) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'بيانات المستخدم أو المطعم مفقودة.' });
      return;
    }
    startSaving(async () => {
      try {
        let finalImageUrl = values.image_url;

        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const storagePath = `restaurants/${restaurantId}/menu_items/${fileName}`;
          const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, imageFile);
          if (uploadError) throw uploadError;
          finalImageUrl = storagePath;
        }

        const itemData: any = {
          ...values,
          image_url: finalImageUrl,
          restaurant_id: restaurantId,
        };

        if (descriptionWasGenerated) {
          itemData.description_last_generated_at = new Date().toISOString();
        }

        if (isEditing) {
          const { error } = await supabase.from('menu_items').update(itemData).eq('id', menuItem.id);
          if (error) throw error;
        } else {
          const newId = crypto.randomUUID();
          const { error } = await supabase.from('menu_items').insert({
            ...itemData,
            id: newId,
            position: itemCount,
            created_at: new Date().toISOString(),
          });
          if (error) throw error;
        }

        toast({ title: isEditing ? 'تم تعديل الطبق بنجاح' : 'تم إضافة الطبق بنجاح' });
        syncPublicPage(restaurantId).catch(() => {});
        onSave?.();
        setOpen(false);
      } catch (error: any) {
        console.error('Save error:', error);
        toast({ variant: 'destructive', title: 'حدث خطأ', description: error.message });
      }
    });
  }

  const isActionPending = isSaving || isGeneratingDesc;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent dir={dir} className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل طبق' : 'إضافة طبق جديد'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'قم بتعديل تفاصيل الطبق أدناه.' : 'أدخل تفاصيل الطبق الجديد ليظهر في قائمة الطعام.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6 pl-2 -mr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Accordion type="multiple" defaultValue={['basic', 'details']} className="w-full">
                <AccordionItem value="basic">
                  <AccordionTrigger className="text-lg font-bold">المعلومات الأساسية</AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم الطبق</FormLabel>
                            <FormControl><Input placeholder="مثال: كباب لحم" {...field} disabled={isActionPending} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel>الوصف</FormLabel>
                              <Button type="button" size="sm" variant="ghost" className="text-xs gap-1 text-primary" onClick={handleGenerateDescription} disabled={isActionPending}>
                                <Sparkles className="h-3.5 w-3.5" />
                                وصف بالذكاء الاصطناعي
                              </Button>
                            </div>
                            <FormControl><Textarea placeholder="وصف جذاب للطبق..." {...field} disabled={isActionPending} rows={3} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="category" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>التصنيف</FormLabel>
                            <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                  >
                                    {field.value || 'اختر أو أنشئ تصنيف...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                                  <CommandInput
                                    placeholder="ابحث أو اكتب تصنيف جديد..."
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && e.currentTarget.value) {
                                        e.preventDefault();
                                        form.setValue('category', e.currentTarget.value);
                                        setCategoriesOpen(false);
                                      }
                                    }}
                                  />
                                  <CommandList>
                                    <CommandEmpty>اكتب اسماً واضغط Enter للإضافة.</CommandEmpty>
                                    <CommandGroup>
                                      {uniqueCategories.map((category) => (
                                        <CommandItem
                                          value={category}
                                          key={category}
                                          onSelect={() => { form.setValue('category', category); setCategoriesOpen(false); }}
                                        >
                                          <Check className={cn('mr-2 h-4 w-4', category === field.value ? 'opacity-100' : 'opacity-0')} />
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
                        )} />
                      </div>
                      <div className="space-y-2">
                        <FormLabel>صورة الطبق</FormLabel>
                        <div
                          className="relative aspect-square border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {imagePreview ? (
                            <StorageImage imagePath={imagePreview} alt="Preview" fill className="object-cover" sizes="300px" />
                          ) : (
                            <div className="text-center p-4">
                              <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-xs text-muted-foreground font-medium">{isRTL ? 'ارفع صورة' : 'Upload image'}</p>
                            </div>
                          )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                        <p className="text-[10px] text-muted-foreground text-center">يفضل صور مربعة، بحد أقصى 4 ميجابايت.</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="details">
                  <AccordionTrigger className="text-lg font-bold">الأسعار والتكلفة</AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>الحجم</TableHead>
                            <TableHead>التكلفة</TableHead>
                            <TableHead>السعر</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <FormField control={form.control} name={`sizes.${index}.name`} render={({ field }) => (
                                  <Input {...field} placeholder="مثال: عادي" />
                                )} />
                              </TableCell>
                              <TableCell>
                                <FormField control={form.control} name={`sizes.${index}.cost`} render={({ field }) => (
                                  <Input type="number" {...field} />
                                )} />
                              </TableCell>
                              <TableCell>
                                <FormField control={form.control} name={`sizes.${index}.price`} render={({ field }) => (
                                  <Input type="number" {...field} />
                                )} />
                              </TableCell>
                              <TableCell>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button
                      type="button" variant="outline" size="sm" className="mt-2"
                      onClick={() => append({ id: `size-${Date.now()}`, name: '', price: 0, cost: 0 })}
                    >
                      <PlusCircle className={`${iconMargin} h-4 w-4`} /> إضافة حجم
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="status">
                  <AccordionTrigger className="text-lg font-bold">الحالة</AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                            <FormItem className="flex items-center space-x-3 space-y-0 gap-2">
                              <FormControl><RadioGroupItem value="available" /></FormControl>
                              <FormLabel className="font-normal">متاح</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 gap-2">
                              <FormControl><RadioGroupItem value="unavailable" /></FormControl>
                              <FormLabel className="font-normal">غير متاح</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-end gap-2 pt-2 pb-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isActionPending}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={isActionPending}>
                  {isActionPending ? (
                    <><Loader2 className={`${iconMargin} h-4 w-4 animate-spin`} /> جاري الحفظ...</>
                  ) : isEditing ? 'حفظ التعديلات' : 'إضافة الطبق'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
