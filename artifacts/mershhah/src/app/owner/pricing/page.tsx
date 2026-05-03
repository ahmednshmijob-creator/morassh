'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart3,
    Star,
    MousePointerClick,
    Lock,
    TrendingUp,
    QrCode,
    Link2,
    Copy,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { MenuItem } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

type AnalyzedItem = MenuItem & {
    popularity: number;
    profitMargin: number;
};

export default function InsightsHubPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [analysisData, setAnalysisData] = useState<AnalyzedItem[]>([]);
    const [totalClicks, setTotalClicks] = useState(0);
    const [hubVisitsQr, setHubVisitsQr] = useState(0);
    const [hubVisitsLink, setHubVisitsLink] = useState(0);
    const [hubUsername, setHubUsername] = useState<string | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

    const isPaid = user?.entitlements?.planId && user.entitlements.planId !== 'free' && user.entitlements.planId !== 'none';

    useEffect(() => {
        if (user?.restaurantId) {
            setIsLoadingData(true);
            const fetchData = async () => {
                try {
                    const restaurantId = user.restaurantId!;
                    const [itemsRes, interactionsRes, hubVisitsRes, restRes] = await Promise.all([
                        supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId),
                        supabase.from('menu_item_interactions').select('menu_item_id').eq('restaurant_id', restaurantId),
                        supabase.from('hub_visits').select('source').eq('restaurant_id', restaurantId),
                        supabase.from('restaurants').select('username').eq('id', restaurantId).single(),
                    ]);

                    const items = (itemsRes.data || []) as MenuItem[];
                    const interactions = interactionsRes.data || [];
                    setTotalClicks(interactions.length);

                    let qrCount = 0; let linkCount = 0;
                    (hubVisitsRes.data || []).forEach((d: any) => {
                        if (d.source === 'qr_branch') qrCount++; else linkCount++;
                    });
                    setHubVisitsQr(qrCount);
                    setHubVisitsLink(linkCount);
                    setHubUsername((restRes.data as any)?.username || null);

                    const popularityMap = new Map();
                    interactions.forEach((i: any) => popularityMap.set(i.menu_item_id, (popularityMap.get(i.menu_item_id) || 0) + 1));

                    const analyzed = items.map(item => {
                        const size = item.sizes?.[0] || { price: 0, cost: 0 };
                        const profit = size.price - (size.cost || 0);
                        const margin = size.price > 0 ? (profit / size.price) * 100 : 0;
                        return { ...item, profitMargin: margin, popularity: popularityMap.get(item.id) || 0 };
                    });
                    analyzed.sort((a, b) => b.popularity - a.popularity);
                    setAnalysisData(analyzed);
                } catch (e: any) {
                    toast({ title: "خطأ في جلب البيانات", description: e.message, variant: "destructive" });
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchData();
        }
    }, [user, toast]);

    useEffect(() => {
        if (!hubUsername || typeof window === 'undefined') return;
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const qrUrl = `${baseUrl.replace(/\/$/, '')}/hub/${hubUsername}?source=qr_branch`;
        import('qrcode').then((QRCode) => {
            QRCode.toDataURL(qrUrl, { width: 280, margin: 2 }).then(setQrDataUrl).catch(() => {});
        }).catch(() => {});
    }, [hubUsername]);

    if (isLoadingData || isUserLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-1/3"/>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Skeleton className="h-32 w-full"/><Skeleton className="h-32 w-full"/><Skeleton className="h-32 w-full"/></div>
                <Skeleton className="h-64 w-full"/>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <PageHeader title="مركز التقارير والرؤى" description="حلل سلوك عملائك وحوّل البيانات إلى قرارات تزيد من أرباحك." />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 text-primary font-bold"><MousePointerClick className="h-4 w-4" /> إجمالي التفاعل</CardDescription>
                        <CardTitle className="text-3xl font-black">{totalClicks}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-[10px] text-muted-foreground">عدد النقرات على أصناف المنيو</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /> رضا العملاء</CardDescription>
                        <CardTitle className="text-3xl font-black">{(user as any)?.rating?.toFixed(1) || '0.0'}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-[10px] text-muted-foreground">بناءً على {(user as any)?.reviewCount || 0} تقييم</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> النمو</CardDescription>
                        <CardTitle className="text-3xl font-black">{totalClicks > 0 ? 'نشط' : 'قيد البدء'}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-[10px] text-muted-foreground">حالة نشاط واجهتك الرقمية</p></CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 text-primary font-bold"><QrCode className="h-4 w-4" /> داخل الفرع (عبر QR)</CardDescription>
                        <CardTitle className="text-3xl font-black">{hubVisitsQr}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-[10px] text-muted-foreground">زيارات من مسح الكود على الطاولة</p></CardContent>
                </Card>
                <Card className="border-2 border-green-200 bg-green-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 text-green-700 font-bold"><Link2 className="h-4 w-4" /> خارج الفرع (عبر رابط)</CardDescription>
                        <CardTitle className="text-3xl font-black">{hubVisitsLink}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-[10px] text-muted-foreground">زيارات من الرابط الذكي في الانستقرام</p></CardContent>
                </Card>
            </div>

            {hubUsername && (
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-black"><QrCode className="h-5 w-5" /> QR مخصص والرابط الذكي</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="space-y-3">
                            <p className="text-sm font-bold text-muted-foreground">الرابط الذكي</p>
                            <div className="flex gap-2 items-center flex-wrap">
                                <code className="text-sm bg-muted px-3 py-2 rounded-lg break-all">
                                    {(import.meta.env.VITE_APP_URL || '').replace(/\/$/, '') || '...'}/hub/{hubUsername}
                                </code>
                                <Button size="sm" variant="outline" className="shrink-0" onClick={() => {
                                    const url = `${(import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')}/hub/${hubUsername}`;
                                    navigator.clipboard.writeText(url);
                                    toast({ title: 'تم نسخ الرابط' });
                                }}><Copy className="h-4 w-4 ml-1" /> نسخ</Button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <p className="text-sm font-bold text-muted-foreground">QR للطاولة</p>
                            {qrDataUrl ? (
                                <div className="inline-flex flex-col items-center gap-3">
                                    <div className="inline-block p-3 bg-white rounded-xl border shadow-sm">
                                        <img src={qrDataUrl} alt="QR للمنيو" className="w-[200px] h-[200px]" />
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = qrDataUrl;
                                        link.download = `hub-qr-${hubUsername || 'menu'}.png`;
                                        document.body.appendChild(link); link.click(); link.remove();
                                    }}>تحميل QR كصورة</Button>
                                </div>
                            ) : (
                                <div className="w-[200px] h-[200px] bg-muted rounded-xl animate-pulse flex items-center justify-center text-xs text-muted-foreground">جاري التوليد...</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-black"><TrendingUp className="h-5 w-5 text-green-500" /> الأصناف الأعلى تفاعلاً</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y p-0">
                        {analysisData.length === 0 ? (
                            <div className="p-10 text-center text-muted-foreground italic">لا توجد بيانات تفاعل بعد.</div>
                        ) : analysisData.slice(0, 5).map((item, idx) => (
                            <div key={item.id || `popular-${idx}`} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                <span className="font-bold">{item.name}</span>
                                <Badge variant="secondary" className="font-mono">{item.popularity} نقرة</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className={cn("shadow-sm overflow-hidden", !isPaid && "opacity-80 relative")}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-black"><BarChart3 className="h-5 w-5 text-primary" /> التقارير المالية المتطورة</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!isPaid ? (
                            <div className="py-12 text-center space-y-4">
                                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto"><Lock className="h-8 w-8 text-primary" /></div>
                                <div className="space-y-1">
                                    <p className="font-bold">هذا التقرير متاح في الباقات المدفوعة</p>
                                    <p className="text-xs text-muted-foreground px-10">اشترك الآن لفتح تقارير الربحية.</p>
                                </div>
                                <Button asChild size="sm" className="rounded-full px-8"><Link href="/pricing">ترقية الحساب الآن</Link></Button>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow><TableHead className="text-right">الطبق</TableHead><TableHead className="text-center">هامش الربح</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysisData.slice(0, 10).map((item, idx) => (
                                            <TableRow key={item.id || `profit-${idx}`}>
                                                <TableCell className="text-right font-medium">{item.name}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={item.profitMargin > 50 ? 'default' : 'outline'} className={cn(item.profitMargin > 50 && "bg-green-500 text-white")}>{item.profitMargin.toFixed(0)}%</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
