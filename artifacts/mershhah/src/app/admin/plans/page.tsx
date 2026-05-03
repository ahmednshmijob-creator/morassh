'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Plan } from '@/lib/types';
import { EditPlanDialog } from '@/components/admin/plans/EditPlanDialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPlans = async () => {
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
    };
    fetchPlans();
  }, [toast]);

  const planSkeletons = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Skeleton className="h-96" />
      <Skeleton className="h-96" />
      <Skeleton className="h-96" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="إدارة باقات الاشتراك" description="قم بتعديل أسعار وروابط الدفع للباقات المتاحة للمشتركين.">
        <EditPlanDialog onSave={() => window.location.reload()}>
          <Button>إضافة باقة جديدة</Button>
        </EditPlanDialog>
      </PageHeader>

      {isLoading ? planSkeletons() : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {plans.map((planData) => (
            <Card key={planData.id} className={`flex flex-col h-full ${planData?.is_featured ? 'border-primary border-2' : ''}`}>
              <CardHeader>
                {planData?.is_featured && (
                  <Badge variant="secondary" className="w-fit bg-primary/10 text-primary mb-2">الأكثر انتشاراً</Badge>
                )}
                <CardTitle>{planData.name}</CardTitle>
                <CardDescription>{planData.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="text-center">
                    <span className="text-4xl font-bold">{planData.price}</span>
                    <span className="text-muted-foreground"> ر.س</span>
                    <span className="text-muted-foreground text-sm"> / {planData.duration_months > 1 ? `${planData.duration_months} أشهر` : 'شهر'}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">حالة الباقة:</p>
                    <Badge variant={planData.is_active ? 'default' : 'destructive'} className={planData.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {planData.is_active ? 'نشطة' : 'غير نشطة'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">رابط الدفع:</p>
                    <p className="text-xs font-mono break-all text-muted-foreground">{planData.payment_link || 'لا يوجد'}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <EditPlanDialog plan={planData} onSave={() => window.location.reload()}>
                  <Button variant="outline" className="w-full" disabled={!planData}>
                    <Pencil className="ml-2 h-4 w-4" /> تعديل الباقة
                  </Button>
                </EditPlanDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
