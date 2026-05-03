'use client';

import { useState, useTransition, useRef, useEffect } from "react";
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
  Dialog as GalleryDialog,
} from "@/components/ui/dialog";
import {
  DialogContent as GalleryDialogContent,
  DialogHeader as GalleryDialogHeader,
  DialogTitle as GalleryDialogTitle,
  DialogDescription as GalleryDialogDescription,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, ChevronsUpDown, Check, ImageIcon, UploadCloud, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { syncPublicPage } from '@/lib/public-pages';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { MenuItem } from "@/lib/types";
import { Badge } from "../ui/badge";
import { Link } from "wouter";
import { Card, CardContent } from "../ui/card";
import { StorageImage } from "../shared/StorageImage";
import { ImageGallery } from "../studio/ImageGallery";

const formSchema = z.object({
  title: z.string().min(2, "العنوان مطلوب"),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
  image_url: z.string().optional().or(z.literal("")),
  external_link: z.string().url({ message: "الرجاء إدخال رابط صحيح (يجب أن يبدأ بـ http)" }).optional().or(z.literal('')),
  valid_until: z.date({ required_error: "تاريخ انتهاء الصلاحية مطلوب." }),
  status: z.enum(['active', 'expired']).default('active'),
  items: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditOfferDialogProps {
  children: React.ReactNode;
  offer?: any;
  onSave?: () => void;
  restaurantId?: string;
  userId?: string;
}

export function EditOfferDialog({ children, offer, onSave, restaurantId, userId }: EditOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const { toast } = useToast();
  const isEditing = !!offer;
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (restaurantId) {
        const { data } = await supabase
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', restaurantId);
        setMenuItems((data || []) as MenuItem[]);
      }
    };

    if (open) {
      fetchMenuItems();
      form.reset(isEditing ? {
        ...offer,
        valid_until: offer.valid_until ? new Date(offer.valid_until) : new Date(),
        items: offer.items || [],
        image_url: offer.image_url || "",
        external_link: offer.external_link || "",
      } : {
        title: "",
        description: "",
        image_url: "",
        external_link: "",
        valid_until: undefined,
        status: 'active',
        items: [],
      });
      setImageFile(null);
      setImagePreview(offer?.image_url || null);
    }
  }, [open, offer, isEditing, form, restaurantId]);

  const handleImageSelect = (imagePath: string) => {
    form.setValue('image_url', imagePath, { shouldValidate: true });
    setImagePreview(imagePath);
    setImageFile(null);
    setGalleryOpen(false);
    toast({ title: "تم اختيار الصورة من المعرض" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) {
            toast({ title: "حجم الصورة كبير", description: "الرجاء اختيار صورة أقل من 4 ميجابايت.", variant: "destructive" });
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        form.setValue('image_url', '', { shouldValidate: false });
    }
  };

  async function onSubmit(values: FormValues) {
    if (!restaurantId) {
        toast({ variant: "destructive", title: "خطأ", description: "معرف المطعم غير موجود." });
        return;
    }

    startSaving(async () => {
        try {
          let finalImageUrl = values.image_url;

          if (imageFile) {
              const fileExt = imageFile.name.split('.').pop();
              const fileName = `restaurants/${restaurantId}/offers/offer-${Date.now()}.${fileExt}`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('restaurant-assets')
                  .upload(fileName, imageFile, { upsert: true });
              if (uploadError) throw uploadError;
              finalImageUrl = uploadData.path;
          }

          const offerData: any = {
              ...values,
              valid_until: values.valid_until.toISOString(),
              image_url: finalImageUrl,
              restaurant_id: restaurantId,
          };

          if (!isEditing) {
              offerData.views_count = 0;
              offerData.clicks_count = 0;
              offerData.link_clicks_count = 0;
          }

          if (isEditing) {
              const { error } = await supabase
                  .from('offers')
                  .update(offerData)
                  .eq('id', offer.id);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('offers').insert(offerData);
              if (error) throw error;
          }

          toast({ title: `تم ${isEditing ? 'تعديل' : 'إضافة'} العرض بنجاح` });
          syncPublicPage(restaurantId).catch(() => {});
          onSave?.();
          setOpen(false);
        } catch (error: any) {
           toast({ variant: "destructive", title: "حدث خطأ", description: error.message });
        }
    });
  }

  const isActionPending = isSaving;

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل عرض' : 'إضافة عرض جديد'}</DialogTitle>
          <DialogDescription>{isEditing ? 'قم بتعديل تفاصيل العرض أدناه.' : 'أدخل تفاصيل العرض الجديد.'}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>عنوان العرض</FormLabel><FormControl><Input placeholder="مثال: خصم اليوم الوطني" {...field} disabled={isActionPending} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>وصف العرض</FormLabel><FormControl><Textarea placeholder="وصف قصير وجذاب للعرض..." {...field} disabled={isActionPending} /></FormControl><FormMessage /></FormItem>
            )}/>

            <FormField control={form.control} name="external_link" render={({ field }) => (
              <FormItem><FormLabel>رابط خارجي (اختياري)</FormLabel><FormControl><Input dir="ltr" placeholder="https://..." {...field} disabled={isActionPending} /></FormControl><FormMessage /><p className="text-[10px] text-muted-foreground">عند النقر على العرض، سيتم توجيه العميل لهذا الرابط.</p></FormItem>
            )}/>

            <div className="space-y-2">
              <FormLabel>صورة العرض</FormLabel>
              <Card className="border-2 border-dashed">
                <CardContent className="p-4 flex flex-col items-center gap-4 text-center">
                  <div className="relative w-full aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <StorageImage imagePath={imagePreview} alt="Offer Image" fill className="object-contain" sizes="500px" />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full">
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <UploadCloud className="ml-2 h-4 w-4" />
                        من ملفاتي
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setGalleryOpen(true)}>
                        <ImageIcon className="ml-2 h-4 w-4" />
                        من المعرض
                      </Button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </CardContent>
              </Card>
            </div>

            <FormField
              control={form.control}
              name="items"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>المنتجات المشمولة في العرض (اختياري)</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between h-auto min-h-10", !field.value?.length && "text-muted-foreground")}>
                            <div className="flex flex-wrap gap-1">
                            {field.value?.length ? field.value.map(itemId => (
                                <Badge variant="secondary" key={itemId}>
                                    {menuItems.find(item => item.id === itemId)?.name}
                                </Badge>
                            )) : "اختر المنتجات..."}
                          </div>
                          <ChevronsUpDown className="mr-auto h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="ابحث عن منتج..." />
                        <CommandList>
                          <CommandEmpty>لا يوجد منتجات.</CommandEmpty>
                          <CommandGroup>
                            {menuItems.map((item) => (
                              <CommandItem value={item.name} key={item.id} onSelect={() => {
                                  const currentItems = field.value || [];
                                  const newItems = currentItems.includes(item.id)
                                    ? currentItems.filter((id) => id !== item.id)
                                    : [...currentItems, item.id];
                                  field.onChange(newItems);
                              }}>
                                <Check className={cn("mr-2 h-4 w-4", field.value?.includes(item.id) ? "opacity-100" : "opacity-0")} />
                                {item.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField control={form.control} name="valid_until" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>صالح حتى تاريخ</FormLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal={true}>
                    <PopoverTrigger asChild>
                        <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isActionPending}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>اختر تاريخ</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => { field.onChange(date); setCalendarOpen(false); }}
                            disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                            initialFocus
                        />
                    </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}/>

            <DialogFooter className="pt-4 sticky bottom-0 bg-background py-2 border-t">
              <div className="flex gap-2 w-full justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={isActionPending}>
                    {isSaving ? "جاري الحفظ..." : "حفظ العرض"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <GalleryDialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <GalleryDialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <GalleryDialogHeader>
                <GalleryDialogTitle>اختر صورة من المعرض</GalleryDialogTitle>
                <GalleryDialogDescription>اضغط على الصورة لاختيارها للعرض. الصور التي تنشئها في الاستوديو تظهر هنا وتنتهي صلاحيتها بعد 30 يوم.</GalleryDialogDescription>
            </GalleryDialogHeader>
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
                <ImageGallery onImageSelect={handleImageSelect} />
            </div>
        </GalleryDialogContent>
    </GalleryDialog>
    </>
  );
}
