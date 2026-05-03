'use client';

import { useState, useEffect } from "react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, X } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Plan } from "@/lib/types";
import { getPlanFeatures } from "@/lib/plan-features";
import { Skeleton } from "@/components/ui/skeleton";

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase.from("plans").select("*").eq("is_active", true);
        const fetched = (data || []) as Plan[];
        fetched.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return (a.price ?? 0) - (b.price ?? 0);
        });
        setPlans(fetched);
      } catch {
        setPlans([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="bg-white text-foreground min-h-screen overflow-x-hidden" dir="rtl">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <header className="py-6 flex justify-between items-center border-b">
          <Logo />
          <Button asChild variant="outline">
            <Link href="/"><ArrowLeft className="ml-2 h-4 w-4" />العودة للرئيسية</Link>
          </Button>
        </header>

        <main className="py-16 md:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold mb-4">باقات شفافة، مصممة لنموّك</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">ابدأ مجاناً أو أطلق العنان للقوة الكاملة للذكاء الاصطناعي لمطعمك أو مقهاك. الخيار لك.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 max-w-7xl mx-auto">
                <Skeleton className="h-[420px] rounded-xl" /><Skeleton className="h-[420px] rounded-xl" /><Skeleton className="h-[420px] rounded-xl" />
              </div>
            ) : plans.length === 0 ? (
              <div className="mt-12 py-16 text-center text-muted-foreground">
                <p className="text-lg">لا توجد باقات متاحة حالياً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 max-w-7xl mx-auto">
                {plans.map((plan, index) => {
                  const features = plan.features && Object.keys(plan.features).length > 0 ? plan.features : getPlanFeatures(plan.id);
                  const isFree = (plan.price ?? 0) === 0;
                  const ctaHref = isFree ? "/register" : (plan.payment_link || "/register");
                  const ctaLabel = isFree ? "ابدأ مجاناً" : "اختر هذه الباقة";
                  const isExternal = ctaHref.startsWith("http");
                  return (
                    <motion.div key={plan.id} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 * index }}>
                      <Card className={`flex flex-col h-full text-right ${plan.is_featured ? 'border-2 border-primary shadow-2xl shadow-primary/10' : ''}`}>
                        <CardHeader className="p-8">
                          {plan.is_featured && <Badge className="mb-2 w-fit bg-primary/10 text-primary border-primary/20">الأكثر انتشاراً</Badge>}
                          <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                          <CardDescription>{plan.description || ''}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 flex-1">
                          <div className="flex items-baseline gap-2 justify-end mb-6">
                            <span className="text-5xl font-black text-primary">{plan.price ?? 0}</span>
                            <span className="text-xl font-semibold text-muted-foreground">ر.س</span>
                          </div>
                          <span className="block text-sm text-muted-foreground text-right -mt-4">{(plan.price ?? 0) === 0 ? 'دائماً' : `/ لكل ${plan.duration_months ?? 1} أشهر`}</span>
                          <Separator className="my-6" />
                          <ul className="space-y-3 text-sm">
                            {Object.entries(features).map(([feature, included]) => (
                              <li key={feature} className={`flex items-center gap-3 ${!included ? 'text-muted-foreground line-through opacity-70' : 'font-medium'}`}>
                                {included ? <Check className="h-5 w-5 text-green-500 shrink-0" /> : <X className="h-5 w-5 text-muted-foreground/50 shrink-0" />}
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                        <CardFooter className="p-8">
                          {isExternal ? (
                            <Button asChild size="lg" className="w-full h-12 text-base" variant={plan.is_featured ? "default" : "outline"}>
                              <a href={ctaHref} target="_blank" rel="noopener noreferrer">{ctaLabel}</a>
                            </Button>
                          ) : (
                            <Button asChild size="lg" className="w-full h-12 text-base" variant={plan.is_featured ? "default" : "outline"}>
                              <Link href={ctaHref}>{ctaLabel}</Link>
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
