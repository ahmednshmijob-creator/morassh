'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Users, TrendingUp, CreditCard, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Subscription = {
  id: string;
  profile_id: string;
  plan_id: string;
  plan_name: string;
  status: 'active' | 'inactive' | 'cancelled';
  start_date: string;
  end_date: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
    phone_number: string;
    restaurant_name: string;
  };
  plan?: {
    price: number;
    duration_months: number;
  };
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'نشط', variant: 'default' },
  inactive: { label: 'غير نشط', variant: 'secondary' },
  cancelled: { label: 'ملغي', variant: 'destructive' },
};

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function FinancePage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subsRes, plansRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select(`*, profile:profiles(full_name, email, phone_number, restaurant_name)`)
          .order('created_at', { ascending: false }),
        supabase.from('plans').select('id, price, duration_months'),
      ]);

      if (subsRes.error) throw subsRes.error;

      const plansMap: Record<string, { price: number; duration_months: number }> = {};
      (plansRes.data || []).forEach((p: any) => { plansMap[p.id] = p; });

      const merged = (subsRes.data || []).map((s: any) => ({
        ...s,
        plan: plansMap[s.plan_id] ?? null,
      }));

      setSubscriptions(merged as Subscription[]);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'خطأ في جلب البيانات', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const paid = subscriptions.filter(s => s.plan_id !== 'free');
  const active = subscriptions.filter(s => s.status === 'active' && s.plan_id !== 'free');
  const totalRevenue = paid.reduce((sum, s) => sum + (s.plan?.price ?? 0), 0);

  const filtered = subscriptions.filter(s => {
    const matchesSearch =
      s.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.profile?.restaurant_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.plan_name?.includes(search);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { title: 'إجمالي الاشتراكات', value: subscriptions.length, icon: Users, desc: 'كل المشتركين' },
    { title: 'اشتراكات مدفوعة نشطة', value: active.length, icon: CreditCard, desc: 'يدفعون الآن' },
    { title: 'إجمالي الإيرادات', value: `${totalRevenue.toLocaleString('ar')} ر.س`, icon: DollarSign, desc: 'من كل الباقات المدفوعة' },
    { title: 'متوسط الباقة', value: paid.length > 0 ? `${(totalRevenue / paid.length).toFixed(0)} ر.س` : '0 ر.س', icon: TrendingUp, desc: 'لكل اشتراك مدفوع' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="المالية والمدفوعات" description="تتبع الاشتراكات والإيرادات لجميع مستخدمي المنصة." />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{isLoading ? <Skeleton className="h-7 w-20" /> : stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">سجل الاشتراكات</CardTitle>
          <CardDescription>جميع الاشتراكات المسجلة في المنصة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو الإيميل أو المطعم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">لا توجد نتائج</div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-right">المشترك</TableHead>
                    <TableHead className="text-right">المطعم</TableHead>
                    <TableHead className="text-right">الباقة</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">بداية</TableHead>
                    <TableHead className="text-right">نهاية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => {
                    const statusInfo = STATUS_LABELS[sub.status] ?? { label: sub.status, variant: 'outline' as const };
                    const isFree = sub.plan_id === 'free';
                    return (
                      <TableRow key={sub.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium">{sub.profile?.full_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{sub.profile?.email || '—'}</div>
                        </TableCell>
                        <TableCell className="text-sm">{sub.profile?.restaurant_name || '—'}</TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${isFree ? 'text-muted-foreground' : 'text-primary'}`}>
                            {sub.plan_name || sub.plan_id}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {isFree ? (
                            <span className="text-muted-foreground">مجاني</span>
                          ) : (
                            <span className="text-green-700 font-bold">{sub.plan?.price ?? '—'} ر.س</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className={sub.status === 'active' ? 'bg-green-100 text-green-700' : ''}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(sub.start_date)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(sub.end_date)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
