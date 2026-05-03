'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/dashboard/StatCard';
import { Users, ShoppingBag, Loader2, Activity, CreditCard, UserPlus, ImagePlus, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

type Stats = {
  totalSubscriptionsCount: number;
  totalRestaurants: number;
  newSubscriptionsThisMonth: number;
};

type ActivityItem = {
  id: string;
  type: 'restaurant_created' | 'subscription_started' | 'logo_added';
  restaurantId?: string | null;
  restaurantName?: string | null;
  planName?: string | null;
  userId?: string | null;
  timestamp: string | null;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalSubscriptionsCount: 0,
    totalRestaurants: 0,
    newSubscriptionsThisMonth: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [restaurantsRes, subscriptionsRes, activityRes] = await Promise.all([
          supabase.from('restaurants').select('id', { count: 'exact', head: true }),
          supabase.from('subscriptions').select('id, start_date'),
          supabase.from('activity').select('*').order('timestamp', { ascending: false }).limit(50),
        ]);

        if (!isMounted) return;

        const totalRestaurants = restaurantsRes.count || 0;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const allSubs = subscriptionsRes.data || [];
        const totalSubscriptionsCount = allSubs.length;
        const newSubscriptionsThisMonth = allSubs.filter((s: any) => {
          const startDate = s.start_date ? new Date(s.start_date) : null;
          return startDate && startDate >= startOfMonth;
        }).length;

        setStats({ totalRestaurants, totalSubscriptionsCount, newSubscriptionsThisMonth });

        const items: ActivityItem[] = (activityRes.data || []).map((d: any) => ({
          id: d.id,
          type: d.type as ActivityItem['type'],
          restaurantId: d.restaurantId ?? null,
          restaurantName: d.restaurantName ?? null,
          planName: d.planName ?? null,
          userId: d.userId ?? null,
          timestamp: d.timestamp ?? null,
        }));
        setActivities(items);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-8 text-right" dir="rtl">
        <div>
          <div className="flex items-center gap-3 justify-end">
            <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 border border-purple-200">مدير النظام</span>
            <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          </div>
          <p className="text-muted-foreground">جاري جلب البيانات الفعلية من النظام...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-right">النشاط الأخير</h2>
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-8 text-right" dir="rtl">
      <div>
        <div className="flex items-center gap-3 justify-end">
          <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 border border-purple-200">مدير النظام</span>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        </div>
        <p className="text-muted-foreground">نظرة عامة دقيقة على أداء ونمو المنصة.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <StatCard title="إجمالي المطاعم" value={stats.totalRestaurants.toString()} icon={ShoppingBag} change="كل المطاعم المنشأة فعلياً" />
        <StatCard title="إجمالي المشتركين" value={stats.totalSubscriptionsCount.toString()} icon={Users} change="إجمالي سجلات الاشتراك" />
        <StatCard title="الاشتراكات الجديدة" value={stats.newSubscriptionsThisMonth.toString()} icon={CreditCard} change="التي بدأت خلال هذا الشهر" />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-right">النشاط الأخير</h2>
        <Card>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
                <div className="p-4 bg-primary/5 rounded-full mb-4">
                  <Activity className="h-10 w-10 text-primary opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-foreground">لا يوجد نشاط مسجل حالياً</h3>
                <p className="max-w-xs mx-auto mt-2 text-sm leading-relaxed">
                  يتم الآن تتبع الأنشطة اللحظية للمشتركين. ستظهر سجلات التفعيل والتحديثات المهمة هنا فور حدوثها.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activities.map((item) => {
                  const ts = item.timestamp ? new Date(item.timestamp) : new Date(0);
                  const label =
                    item.type === 'restaurant_created' ? 'تم إنشاء حساب'
                    : item.type === 'subscription_started' ? 'تم تفعيل اشتراك'
                    : item.type === 'logo_added' ? 'تم إضافة شعار'
                    : 'نشاط';
                  const Icon =
                    item.type === 'restaurant_created' ? UserPlus
                    : item.type === 'subscription_started' ? Sparkles
                    : ImagePlus;
                  const detail =
                    item.type === 'restaurant_created' || item.type === 'logo_added'
                      ? item.restaurantName || '—'
                      : item.type === 'subscription_started'
                      ? [item.planName, item.restaurantName].filter(Boolean).join(' · ') || '—'
                      : '—';
                  return (
                    <li key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground truncate">{detail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0" title={ts.toLocaleString('ar-SA')}>
                        {formatDistanceToNow(ts, { addSuffix: true, locale: ar })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
