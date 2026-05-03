'use client';

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Bot, Loader2, FileCheck, Save, Sparkles, X, AlertCircle, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { extractMenuFromImage } from "@/ai/flows/extract-menu-from-image";
import { supabase } from '@/lib/supabase';
import { Badge } from "../ui/badge";
import { useUser } from "@/hooks/useUser";
import { Link } from "wouter";
import { useLanguage } from "@/components/shared/LanguageContext";

interface ImportMenuDialogProps {
  children: React.ReactNode;
  restaurantId?: string | null;
  onSave: () => void;
}

type Stage = "upload" | "analyzing" | "confirm" | "saving";

export function ImportMenuDialog({ children, restaurantId, onSave }: ImportMenuDialogProps) {
  const { user } = useUser();
  const { t, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState({ count: 0, limit: 3 });
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);

  const isPaid = user?.entitlements?.planId && user.entitlements.planId !== 'free';
  const monthlyLimit = isPaid ? 20 : 3;

  const iconMargin = isRTL ? 'ml-2' : 'mr-2';
  const dir: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    if (open && restaurantId) {
        fetchUsageStats();
    }
  }, [open, restaurantId, isPaid]);

  const fetchUsageStats = async () => {
    if (!restaurantId) return;
    setIsCheckingUsage(true);
    try {
        const { data } = await supabase
            .from('restaurants')
            .select('menu_import_monthly_count, menu_import_last_reset')
            .eq('id', restaurantId)
            .single();

        if (data) {
            let count = data.menu_import_monthly_count || 0;
            const lastReset = data.menu_import_last_reset ? new Date(data.menu_import_last_reset) : null;
            const now = new Date();
            const shouldReset = !lastReset || (now.getTime() - lastReset.getTime() > 30 * 24 * 60 * 60 * 1000);

            if (shouldReset) {
                await supabase.from('restaurants').update({
                    menu_import_monthly_count: 0,
                    menu_import_last_reset: now.toISOString(),
                }).eq('id', restaurantId);
                count = 0;
            }

            setUsageStats({ count, limit: monthlyLimit });
        }
    } catch (error) {
        console.error("Error fetching usage stats:", error);
    } finally {
        setIsCheckingUsage(false);
    }
  };

  const resetState = () => {
    setStage("upload");
    setImageFile(null);
    setImagePreview(null);
    setExtractedData([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) {
            toast({
              title: isRTL ? "حجم الصورة كبير" : "Image too large",
              description: isRTL ? "الرجاء اختيار صورة بحجم أقل من 4 ميجابايت." : "Please choose an image smaller than 4MB.",
              variant: "destructive"
            });
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !restaurantId) return;

    if (usageStats.count >= usageStats.limit) {
        toast({
            title: isRTL ? "عذراً، انتهت محاولاتك" : "Sorry, you've run out of attempts",
            description: isPaid
                ? (isRTL ? "لقد استنفدت 20 محاولة لهذا الشهر." : "You've used all 20 attempts for this month.")
                : (isRTL ? "لقد استنفدت 3 محاولات مجانية لهذا الشهر. قم بالترقية للحصول على محاولات أكثر." : "You've used all 3 free attempts this month. Upgrade for more."),
            variant: "destructive"
        });
        return;
    }

    setStage("analyzing");

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
        try {
            const result = await extractMenuFromImage({
                imageDataUri: reader.result as string,
            });

            const extractedItems = result.items || [];

            if (extractedItems.length > 0) {
                const { data: current } = await supabase
                    .from('restaurants')
                    .select('menu_import_monthly_count')
                    .eq('id', restaurantId)
                    .single();

                await supabase.from('restaurants').update({
                    menu_import_monthly_count: (current?.menu_import_monthly_count || 0) + 1,
                }).eq('id', restaurantId);

                setExtractedData(extractedItems);
                setStage("confirm");
                fetchUsageStats();
                toast({
                  title: isRTL ? "تم تحليل القائمة!" : "Menu analyzed!",
                  description: isRTL ? `تم العثور على ${extractedItems.length} صنف.` : `Found ${extractedItems.length} items.`
                });
            } else {
                toast({
                  title: isRTL ? "لم يتم العثور على أصناف" : "No items found",
                  description: isRTL ? "حاول استخدام صورة أوضح أو تأكد من إضاءة الغرفة." : "Try using a clearer image or better lighting.",
                  variant: "destructive"
                });
                setStage("upload");
            }
        } catch (error: any) {
            console.error("Analysis Error:", error);
            toast({ title: isRTL ? "فشل التحليل" : "Analysis failed", description: error.message, variant: "destructive" });
            setStage("upload");
        }
    };
  };

  const handleSaveToMenu = async () => {
    if (!restaurantId || extractedData.length === 0) return;
    setStage("saving");

    try {
        const itemsToInsert = extractedData.map(item => ({
            name: item.name,
            description: item.description || "",
            category: item.category || 'main',
            sizes: item.sizes.map((s: any) => ({
                id: `size-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                name: s.name,
                price: s.price,
                cost: 0
            })),
            calories: item.calories || null,
            image_url: "",
            status: 'available',
            display_tags: 'none',
            restaurant_id: restaurantId,
            createdAt: new Date().toISOString(),
        }));

        const { error } = await supabase.from('menu_items').insert(itemsToInsert);
        if (error) throw error;

        toast({
          title: isRTL ? "تم حفظ الأصناف!" : "Items saved!",
          description: isRTL ? `تمت إضافة ${extractedData.length} صنف بنجاح.` : `Successfully added ${extractedData.length} items.`
        });
        onSave();
        setOpen(false);
    } catch (error: any) {
        console.error("Save error:", error);
        toast({ title: isRTL ? "فشل الحفظ" : "Save failed", description: error.message, variant: "destructive" });
        setStage("confirm");
    }
  };

  const isLimitReached = usageStats.count >= usageStats.limit;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetState(); setOpen(isOpen); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent dir={dir} className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div className={`space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <DialogTitle className={`flex items-center gap-2 text-xl font-black ${isRTL ? 'justify-end' : 'justify-start'}`}>
                    {isRTL ? 'إضافة أصناف بالذكاء الاصطناعي' : 'Add Items with AI'}
                    <Sparkles className="text-primary h-6 w-6"/>
                </DialogTitle>
                <DialogDescription>
                    {isRTL
                      ? 'ارفع صورة من قائمة طعامك ودع الذكاء الاصطناعي يقوم بتعبئة البيانات نيابة عنك.'
                      : 'Upload a photo of your menu and let AI fill in the data for you.'}
                </DialogDescription>
            </div>
            <Badge variant={isLimitReached ? "destructive" : "outline"} className="gap-1.5 py-1 px-3">
                {isCheckingUsage ? <Loader2 className="h-3 w-3 animate-spin"/> : (
                    <>{isRTL ? 'محاولاتك:' : 'Attempts:'} {usageStats.count} / {usageStats.limit}</>
                )}
            </Badge>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
            <motion.div key={stage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 overflow-y-auto min-h-[400px] p-1">
                {stage === "upload" && (
                    <div className="flex flex-col items-center justify-center h-full gap-6">
                        <div
                            className="relative w-full max-w-lg aspect-[4/3] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:bg-muted/50 transition-all group overflow-hidden bg-muted/20"
                            onClick={() => !isLimitReached && fileInputRef.current?.click()}
                        >
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            {imagePreview ? (
                                <img src={imagePreview} alt="Menu Preview" className="object-contain h-full w-full rounded-md" />
                            ) : (
                                <div className="text-muted-foreground space-y-3">
                                    <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto group-hover:scale-110 transition-transform">
                                        <UploadCloud className="h-10 w-10 text-primary" />
                                    </div>
                                    <p className="font-bold text-lg text-foreground">{isRTL ? 'اضغط لرفع صورة المنيو' : 'Click to upload menu image'}</p>
                                    <p className="text-xs max-w-xs mx-auto">{isRTL ? 'تأكد أن الصورة واضحة والأسعار ظاهرة لنتائج أفضل.' : 'Make sure the image is clear and prices are visible for best results.'}</p>
                                </div>
                            )}
                            {isLimitReached && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 gap-2">
                                <Lock className="h-10 w-10 text-muted-foreground" />
                                <p className="font-bold text-center">{isRTL ? 'لقد وصلت للحد الأقصى لهذا الشهر' : 'You have reached the monthly limit'}</p>
                                {!isPaid && <Button asChild size="sm" className="mt-2"><Link href="/pricing">{isRTL ? 'اشترك لزيادة حد المحاولات' : 'Subscribe for more attempts'}</Link></Button>}
                            </div>}
                        </div>
                        <Button onClick={handleAnalyze} disabled={!imageFile || isLimitReached} size="lg" className="h-14 px-8 text-lg font-bold shadow-lg">
                            <Bot className={`${iconMargin} h-5 w-5`} />
                            {isRTL ? 'ابدأ قراءة الأصناف' : 'Start Reading Items'}
                        </Button>
                    </div>
                )}

                {stage === "analyzing" && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-6">
                        <div className="relative">
                            <Loader2 className="h-20 w-20 text-primary animate-spin" />
                            <Bot className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black">{isRTL ? 'جاري تحليل القائمة...' : 'Analyzing menu...'}</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">{isRTL ? 'يقوم الذكاء الاصطناعي الآن بقراءة النصوص وتحويلها إلى بيانات منظمة.' : 'AI is now reading the text and converting it into structured data.'}</p>
                        </div>
                    </div>
                )}

                 {stage === "confirm" && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-green-50 border border-green-100 p-4 rounded-xl">
                           <div className="flex items-center gap-3">
                               <div className="bg-green-500 p-2 rounded-full text-white"><FileCheck className="h-5 w-5" /></div>
                               <div className={isRTL ? 'text-right' : 'text-left'}>
                                   <h3 className="font-black">{isRTL ? 'اكتمل الاستخراج بنجاح!' : 'Extraction completed!'}</h3>
                                   <p className="text-xs text-green-700">{isRTL ? `تم العثور على ${extractedData.length} صنف مع أسعارها.` : `Found ${extractedData.length} items with prices.`}</p>
                               </div>
                           </div>
                           <Button variant="ghost" size="sm" onClick={resetState} className="text-green-700 hover:bg-green-100">
                             <X className={`${iconMargin} h-4 w-4`}/> {isRTL ? 'إلغاء' : 'Cancel'}
                           </Button>
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto border rounded-xl divide-y">
                            {extractedData.map((item, index) => (
                                <div key={index} className={`p-4 hover:bg-muted/30 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-base">{item.name}</h4>
                                        <Badge variant="secondary" className="font-medium">{item.category}</Badge>
                                    </div>
                                    {item.description && <p className="text-xs text-muted-foreground leading-relaxed mb-3">{item.description}</p>}
                                    <div className={`flex gap-2 flex-wrap ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                        {item.sizes.map((size: any, sIndex: number) => (
                                            <Badge key={sIndex} variant="outline" className="bg-background font-mono text-sm font-bold border-primary/20 text-primary">
                                                {size.name}: {size.price} {isRTL ? 'ر.س' : 'SAR'}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                 {stage === "saving" && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                        <h3 className="text-xl font-bold">{isRTL ? 'جاري إضافة الأصناف إلى قائمتك...' : 'Adding items to your menu...'}</h3>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>

        <DialogFooter className="pt-4 border-t px-0">
          {stage === 'confirm' && (
            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>{isRTL ? 'يمكنك إضافة صور المنتجات يدوياً لكل طبق بعد الحفظ.' : 'You can add product images manually for each item after saving.'}</span>
                 </div>
                 <Button onClick={handleSaveToMenu} size="lg" className="w-full sm:w-auto h-12 px-10 font-bold">
                    <Save className={`${iconMargin} h-5 w-5`} />
                    {isRTL ? `إضافة ${extractedData.length} أصناف للمنيو` : `Add ${extractedData.length} items to menu`}
                </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
