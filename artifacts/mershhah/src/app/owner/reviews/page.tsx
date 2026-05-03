'use client';

import { useEffect, useState, useMemo, useTransition } from 'react';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

import PageHeader from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageCircle, TrendingUp, User as UserIcon, Bot, ThumbsUp, ThumbsDown, Lightbulb, Sparkles, Loader2, Eye, EyeOff } from "lucide-react";
import StatCard from '@/components/dashboard/StatCard';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { analyzeReviews, AnalyzeReviewsOutput } from '@/ai/flows/analyze-reviews';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Link } from 'wouter';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string | null;
  is_visible?: boolean;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star key={star} className={`h-4 w-4 ${rating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
    ))}
  </div>
);

export default function ReviewsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAnalyzing, startAnalysis] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<AnalyzeReviewsOutput | null>(null);
  const { toast } = useToast();
  const [updatingVisibility, startVisibilityUpdate] = useTransition();

  const canUseAiAnalysis = user?.entitlements.canUseAiAnalysis ?? false;

  const fetchReviews = async () => {
    if (!user?.restaurantId) return;
    setIsLoadingData(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('restaurant_id', user.restaurantId)
      .order('createdAt', { ascending: false });
    if (!error) setReviews((data || []) as Review[]);
    setIsLoadingData(false);
  };

  useEffect(() => {
    if (user?.restaurantId) {
      fetchReviews();
      const channel = supabase
        .channel(`reviews-${user.restaurantId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `restaurant_id=eq.${user.restaurantId}` }, fetchReviews)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    } else if (!isUserLoading) {
      setIsLoadingData(false);
      return;
    }
    return;
  }, [user, isUserLoading]);

  const stats = useMemo(() => {
    if (reviews.length === 0) return { totalReviews: 0, averageRating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const averageRating = totalRating / totalReviews;
    const distribution = reviews.reduce((acc, r) => {
      const rating = Math.floor(r.rating || 0);
      if (rating >= 1 && rating <= 5) acc[rating as keyof typeof acc]++;
      return acc;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    return { totalReviews, averageRating, distribution };
  }, [reviews]);

  const handleAnalyzeReviews = () => {
    if (!user?.restaurantId || !user.name || reviews.length === 0) {
      toast({ title: "لا توجد بيانات كافية", description: "يجب أن يكون هناك تقييمات لتحليلها.", variant: "destructive" });
      return;
    }
    startAnalysis(async () => {
      try {
        if (user.entitlements.planId === 'free' && !user.ai_trial_used) {
          await supabase.from('profiles').update({ ai_trial_used: true }).eq('id', user.uid);
        }
        const { data: restData } = await supabase.from('restaurants').select('analysis_reviews_daily_count, analysis_reviews_last_reset').eq('id', user.restaurantId!).single();
        let dailyCount = restData?.analysis_reviews_daily_count || 0;
        const lastReset = restData?.analysis_reviews_last_reset ? new Date(restData.analysis_reviews_last_reset) : null;
        const today = new Date();
        const isNewDay = !lastReset || lastReset.getDate() !== today.getDate() || lastReset.getMonth() !== today.getMonth() || lastReset.getFullYear() !== today.getFullYear();
        if (isNewDay) {
          dailyCount = 0;
          await supabase.from('restaurants').update({ analysis_reviews_daily_count: 0, analysis_reviews_last_reset: new Date().toISOString() }).eq('id', user.restaurantId!);
        }
        if (dailyCount >= 3) {
          toast({ title: "تم الوصول للحد اليومي", description: "لقد استخدمت تحليلاتك الثلاثة لهذا اليوم.", variant: "destructive" });
          return;
        }
        const reviewDataForAI = reviews.map(r => ({ rating: r.rating, comment: r.comment || '' }));
        const result = await analyzeReviews({ reviews: reviewDataForAI, restaurantName: user.name! });
        setAnalysisResult(result);
        await supabase.from('restaurants').update({ analysis_reviews_daily_count: (dailyCount + 1) }).eq('id', user.restaurantId!);
        toast({ title: "تم تحليل الآراء بنجاح!" });
      } catch (error: any) {
        toast({ title: "فشل التحليل", description: error.message, variant: "destructive" });
      }
    });
  };

  const handleVisibilityToggle = (reviewId: string, newVisibility: boolean) => {
    startVisibilityUpdate(async () => {
      const { error } = await supabase.from('reviews').update({ is_visible: newVisibility }).eq('id', reviewId);
      if (error) {
        toast({ title: "خطأ", description: 'لم نتمكن من تحديث حالة التقييم.', variant: 'destructive' });
      } else {
        toast({ title: `تم ${newVisibility ? 'إظهار' : 'إخفاء'} التقييم بنجاح.` });
        fetchReviews();
      }
    });
  };

  const loading = isUserLoading || isLoadingData;

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="تقييمات العملاء" description="آراء عملائك تساعدك على التطور والتحسين." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-48" /><Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="تقييمات العملاء" description="هنا تجد كل آراء عملائك لمساعدتك على التطور والتحسين المستمر." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="متوسط التقييم" value={stats.averageRating.toFixed(1)} icon={Star} change={`من ${stats.totalReviews} تقييم`} />
        <StatCard title="إجمالي التقييمات" value={stats.totalReviews.toString()} icon={MessageCircle} />
        <StatCard title="التقييم الأعلى" value={`${(stats.distribution[5] / stats.totalReviews * 100 || 0).toFixed(0)}%`} icon={TrendingUp} change="من التقييمات كانت 5 نجوم" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-6 w-6 text-primary"/>تحليل الآراء بالذكاء الاصطناعي</CardTitle>
          <CardDescription>احصل على ملخص سريع لأبرز نقاط القوة والضعف وتوصية ذكية. (3 تحليلات يومياً)</CardDescription>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="flex items-center justify-center h-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : analysisResult ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-bold flex items-center gap-2 text-green-800"><ThumbsUp/> نقاط القوة</h4>
                  <ul className="list-disc pr-5 space-y-1 text-sm text-green-700">{analysisResult.positiveThemes.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
                <div className="space-y-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-bold flex items-center gap-2 text-red-800"><ThumbsDown/> نقاط للتحسين</h4>
                  <ul className="list-disc pr-5 space-y-1 text-sm text-red-700">{analysisResult.negativeThemes.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
                <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-bold flex items-center gap-2 text-blue-800"><Star/> مؤشر الرضا</h4>
                  <p className="text-4xl font-black text-blue-900 text-center pt-2">{analysisResult.sentimentScore}<span className="text-2xl">%</span></p>
                </div>
              </div>
              <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-bold flex items-center gap-2 text-amber-800"><Lightbulb/> توصية ذكية</h4>
                <p className="text-sm text-amber-700">{analysisResult.actionableInsight}</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {canUseAiAnalysis ? 'اضغط على الزر لبدء تحليل جميع تقييماتك.' : 'هذه الميزة متاحة في الباقات المدفوعة.'}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="w-full space-y-2">
            <Button onClick={handleAnalyzeReviews} disabled={isAnalyzing || reviews.length === 0 || !canUseAiAnalysis} className="w-full">
              {isAnalyzing ? <Loader2 className="h-4 w-4 ml-2 animate-spin"/> : <Sparkles className="h-4 w-4 ml-2"/>}
              {analysisResult ? 'إعادة التحليل' : 'تحليل الآراء الآن'}
            </Button>
            {!canUseAiAnalysis && (
              <p className="text-xs text-center text-muted-foreground">للوصول لهذه الميزة، قم بترقية باقتك. <Link href="/pricing" className="text-primary underline font-semibold">عرض الباقات</Link></p>
            )}
          </div>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>توزيع التقييمات</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[5, 4, 3, 2, 1].map(star => (
              <div key={star} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1">{star} <Star className="h-3 w-3 text-amber-400" /></span>
                  <span className="text-muted-foreground">{stats.distribution[star as keyof typeof stats.distribution]}</span>
                </div>
                <Progress value={stats.totalReviews > 0 ? (stats.distribution[star as keyof typeof stats.distribution] / stats.totalReviews) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>أحدث التقييمات</CardTitle></CardHeader>
          <CardContent className="space-y-3 max-h-[30rem] overflow-y-auto">
            {reviews.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">لا توجد تقييمات بعد.</div>
            ) : reviews.map(review => {
              const isVisible = review.is_visible !== false;
              return (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <UserIcon className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-muted-foreground">
                          {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: ar }) : ''}
                        </span>
                      </div>
                      {review.comment && <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>}
                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t">
                        <Label htmlFor={`vis-${review.id}`} className="text-xs text-muted-foreground flex items-center gap-1">
                          {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {isVisible ? 'معروض للعامة' : 'مخفي'}
                        </Label>
                        <Switch id={`vis-${review.id}`} checked={isVisible} onCheckedChange={(checked) => handleVisibilityToggle(review.id, checked)} disabled={updatingVisibility} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
