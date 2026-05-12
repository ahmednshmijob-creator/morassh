'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Plan } from '@/lib/types';
import { EditPlanDialog } from '@/components/admin/plans/EditPlanDialog';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('plans').select('*').order('price');
      if (error) throw error;
      setPlans((data || []) as Plan[]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'خطأ في جلب الباقات', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  async function deletePlan(planId: string) {
    try {
      const { error } = await supabase.from('plans').delete().eq('id', planId);
      if (error) throw error;
      toast({ title: 'تم حذف الباقة' });
      fetchPlans();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'خطأ في الحذف', description: err.message });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="متجر الباقات" description="أضف وعدّل الباقات التي تظهر للمشتركين — كل باقة كمنتج في متجر.">
        <EditPlanDialog onSave={fetchPlans}>
          <Button className="gap-2"><Plus className="h-4 w-4" />إضافة باقة جديدة</Button>
        </EditPlanDialog>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[480px] rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="text-6xl">📦</div>
          <p className="text-xl font-bold">لا توجد باقات بعد</p>
          <p className="text-muted-foreground">أضف أول باقة الآن للبدء</p>
          <EditPlanDialog onSave={fetchPlans}>
            <Button className="gap-2"><Plus className="h-4 w-4" />إضافة أول باقة</Button>
          </EditPlanDialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const isFree = (plan.price ?? 0) === 0;
            const features = plan.features ? Object.entries(plan.features) : [];
            const included = features.filter(([, v]) => v);
            const excluded = features.filter(([, v]) => !v);

            return (
              <Card
                key={plan.id}
                className={`flex flex-col h-full transition-shadow hover:shadow-lg ${plan.is_featured ? 'border-primary border-2 shadow-primary/10 shadow-md' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      {plan.is_featured && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 mb-1">⭐ الأكثر انتشاراً</Badge>
                      )}
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {plan.description && (
                        <CardDescription className="text-sm leading-relaxed">{plan.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'} className={`shrink-0 ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                      {plan.is_active ? 'نشطة' : 'مخفية'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Price block */}
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
                          لكل {plan.duration_months === 1 ? 'شهر' : plan.duration_months === 3 ? '3 أشهر' : plan.duration_months === 12 ? 'سنة' : `${plan.duration_months} أشهر`}
                        </p>
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Features */}
                  {features.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {included.map(([label]) => (
                        <li key={label} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="font-medium">{label}</span>
                        </li>
                      ))}
                      {excluded.map(([label]) => (
                        <li key={label} className="flex items-start gap-2 opacity-50">
                          <X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="line-through text-muted-foreground">{label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">لا توجد مميزات محددة بعد</p>
                  )}

                  {/* Plan ID */}
                  <div className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground">معرّف الباقة</p>
                    <p className="text-xs font-mono text-foreground break-all">{plan.id}</p>
                  </div>
                </CardContent>

                <CardFooter className="gap-2 pt-3">
                  <EditPlanDialog plan={plan} onSave={fetchPlans}>
                    <Button variant="outline" className="flex-1 gap-2">
                      <Pencil className="h-4 w-4" /> تعديل
                    </Button>
                  </EditPlanDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف باقة "{plan.name}"؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          هذا الإجراء لا يمكن التراجع عنه. المستخدمون المشتركون في هذه الباقة لن يتأثروا.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePlan(plan.id)} className="bg-destructive hover:bg-destructive/90">
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
