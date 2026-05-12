'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Loader2, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useCheckout } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/use-toast';
import type { Plan } from '@/lib/types';

export default function OwnerUpgradePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const { user } = useUser();
  const { startCheckout, isLoading: isCheckingOut, error: checkoutError } = useCheckout();
  const { toast } = useToast();

  const currentPlanId = user?.entitlements?.planId ?? 'free';
  const currentPlanName = user?.entitlements?.planName ?? 'الباقة المجانية';

  useEffect(() => {
    supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price')
      .then(({ data }) => {
        setPlans((data || []) as Plan[]);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (checkoutError) {
      toast({ variant: 'destructive', title: 'خطأ في الدفع', description: checkoutError });
      setLoadingPlanId(null);
    }
  }, [checkoutError, toast]);

  async function handleUpgrade(plan: Plan) {
    if (!user) return;
    setLoadingPlanId(plan.id);
    await startCheckout(plan.id);
    setLoadingPlanId(null);
  }

  const isPlanActive = (planId: string) => currentPlanId === planId;

  return (
    <div className="space-y-8">
      <PageHeader
        title="ترقية الباقة"
        description="اختر الباقة المناسبة لمشروعك وأطلق العنان لكامل إمكانيات المنصة."
      />

      {/* Current plan banner */}
      <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-5 py-4">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">باقتك الحالية</p>
          <p className="font-bold text-sm">{currentPlanName}</p>
        </div>
        {currentPlanId === 'free' || currentPlanId === 'none' ? (
          <Badge variant="secondary" className="mr-auto">مجانية</Badge>
        ) : (
          <Badge className="mr-auto bg-green-100 text-green-700">نشطة</Badge>
        )}
      </div>

      {/* Plans grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[460px] rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p>لا توجد باقات متاحة حالياً. تواصل مع الدعم.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const isFree = (plan.price ?? 0) === 0;
            const isActive = isPlanActive(plan.id);
            const isPlanLoading = loadingPlanId === plan.id && isCheckingOut;
            const features = plan.features ? Object.entries(plan.features) : [];

            return (
              <Card
                key={plan.id}
                className={`flex flex-col h-full transition-all ${
                  plan.is_featured
                    ? 'border-primary border-2 shadow-lg shadow-primary/10'
                    : isActive
                    ? 'border-green-400 border-2'
                    : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      {plan.is_featured && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 mb-1 gap-1">
                          <Zap className="h-3 w-3" />الأكثر انتشاراً
                        </Badge>
                      )}
                      {isActive && (
                        <Badge className="bg-green-100 text-green-700 mb-1 gap-1">
                          <ShieldCheck className="h-3 w-3" />باقتك الحالية
                        </Badge>
                      )}
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Price */}
                  <div className={`rounded-xl p-4 text-center ${plan.is_featured ? 'bg-primary/5 border border-primary/10' : 'bg-muted/50'}`}>
                    {isFree ? (
                      <div className="text-3xl font-black text-primary">مجانية</div>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-black text-primary">{plan.price?.toLocaleString('ar')}</span>
                          <span className="text-muted-foreground font-semibold">ر.س</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {plan.duration_months === 1
                            ? 'شهر واحد'
                            : plan.duration_months === 3
                            ? 'كل 3 أشهر'
                            : plan.duration_months === 12
                            ? 'سنة كاملة'
                            : `كل ${plan.duration_months} أشهر`}
                        </p>
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Features list */}
                  {features.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {features.filter(([, v]) => v).map(([label]) => (
                        <li key={label} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="font-medium">{label}</span>
                        </li>
                      ))}
                      {features.filter(([, v]) => !v).map(([label]) => (
                        <li key={label} className="flex items-start gap-2 opacity-40">
                          <X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="line-through text-muted-foreground">{label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground py-2">تواصل معنا لمعرفة التفاصيل</p>
                  )}
                </CardContent>

                <CardFooter className="pt-3">
                  {isActive ? (
                    <Button className="w-full" variant="outline" disabled>
                      <ShieldCheck className="h-4 w-4 ml-2 text-green-600" />
                      باقتك الحالية
                    </Button>
                  ) : isFree ? (
                    <Button className="w-full" variant="ghost" disabled>
                      الباقة المجانية
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.is_featured ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan)}
                      disabled={isPlanLoading}
                    >
                      {isPlanLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري التحويل...</>
                      ) : (
                        <><Zap className="h-4 w-4 ml-2" />ترقية لهذه الباقة</>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground pb-4">
        بعد الضغط على "ترقية" ستُحوَّل لبوابة الدفع الآمنة — سيتم تفعيل باقتك تلقائياً بعد نجاح الدفع.
      </p>
    </div>
  );
}
