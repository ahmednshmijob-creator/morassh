"use client";

import { useEffect, useState, useTransition, useMemo } from 'react';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { ChevronRight, Star, Info } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { getPublicPage, syncPublicPage } from '@/lib/public-pages';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import { StorageImage } from '@/components/shared/StorageImage';
import { Skeleton } from '@/components/ui/skeleton';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string | null;
  is_visible?: boolean;
}

const StarRating = ({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) => {
  const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn(starSize, rating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-300')} />
      ))}
    </div>
  );
};

const RatingDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  restaurantName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rating: number, comment: string) => void;
  isSubmitting: boolean;
  restaurantName: string;
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating > 0) onSubmit(rating, comment);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تقييم {restaurantName}</DialogTitle>
          <DialogDescription>شاركنا رأيك لمساعدتنا على التحسن.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex justify-center mb-4" dir="ltr">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className="h-8 w-8 cursor-pointer transition-colors"
                fill={star <= (hoverRating || rating) ? '#f59e0b' : 'none'}
                stroke={star <= (hoverRating || rating) ? '#f59e0b' : 'currentColor'}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
          <Textarea placeholder="اترك تعليقك هنا (اختياري)" value={comment} onChange={(e) => setComment(e.target.value)} className="rounded-xl" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={rating === 0 || isSubmitting}>
            {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function PublicReviewsPage() {
  const params = useParams();
  const username = params.username as string;
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRatingDialogOpen, setRatingDialogOpen] = useState(false);
  const [isSubmittingRating, startRatingSubmission] = useTransition();

  const fetchReviews = async (restaurantId: string) => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .neq('is_visible', false)
      .order('created_at', { ascending: false });
    setReviews((data || []) as Review[]);
  };

  useEffect(() => {
    if (!username) return;
    setLoading(true);

    const init = async () => {
      try {
        const data = await getPublicPage(username);
        if (data?.restaurant && Array.isArray(data.reviews)) {
          setRestaurant(data.restaurant);
          setReviews(data.reviews as Review[]);
          setLoading(false);
          return;
        }

        const { data: rest } = await supabase
          .from('restaurants')
          .select('*')
          .eq('username', username)
          .limit(1)
          .single();

        if (!rest) {
          setRestaurant(null);
          setLoading(false);
          return;
        }

        setRestaurant(rest);
        await fetchReviews(rest.id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [username]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const channel = supabase
      .channel(`reviews-${restaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `restaurant_id=eq.${restaurant.id}` },
        () => fetchReviews(restaurant.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurant?.id]);

  const handleRateSubmit = (rating: number, comment: string) => {
    if (!restaurant) return;
    startRatingSubmission(async () => {
      try {
        const { error: insertError } = await supabase.from('reviews').insert({
          rating,
          comment,
          created_at: new Date().toISOString(),
          restaurant_id: restaurant.id,
          is_visible: true,
        });
        if (insertError) throw insertError;

        const { data: allReviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('restaurant_id', restaurant.id)
          .neq('is_visible', false);

        if (allReviews && allReviews.length > 0) {
          const total = allReviews.reduce((sum: number, r: any) => sum + r.rating, 0);
          const avg = total / allReviews.length;
          await supabase.from('restaurants').update({
            rating: avg,
            review_count: allReviews.length,
          }).eq('id', restaurant.id);
        }

        toast({ title: 'شكراً لتقييمك!', description: 'نحن نقدر رأيك.' });
        setRatingDialogOpen(false);
        syncPublicPage(restaurant.id).catch(() => {});
      } catch (error) {
        console.error('Failed to submit rating:', error);
        toast({ title: 'خطأ', description: 'فشل إرسال التقييم.', variant: 'destructive' });
      }
    });
  };

  const { averageRating, distribution } = useMemo(() => {
    if (reviews.length === 0) return { averageRating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = totalRating / reviews.length;
    const dist = reviews.reduce(
      (acc, review) => {
        const r = Math.floor(review.rating || 0);
        if (r >= 1 && r <= 5) acc[r as keyof typeof acc]++;
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    );
    return { averageRating: avg, distribution: dist };
  }, [reviews]);

  const primaryColor = restaurant?.primaryColor || '#714dfa';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]" dir="rtl">
        <div className="h-24 w-full bg-gray-100 animate-pulse" />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-24 w-24 rounded-2xl mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 text-center p-6" dir="rtl">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
          <Info className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black text-right mt-4">المطعم غير موجود!</h1>
        <Button asChild className="w-full max-w-xs mt-6 h-12 rounded-2xl font-bold">
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-screen bg-[#fafafa] pb-12 overflow-x-hidden" dir="rtl">
        <div className="bg-white border-b px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center text-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 rounded-2xl bg-muted/50 text-foreground hover:bg-muted"
            asChild
          >
            <Link href={`/hub/${username}`}>
              <ChevronRight className="h-6 w-6" />
            </Link>
          </Button>

          <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shadow-lg overflow-hidden">
            <StorageImage imagePath={restaurant.logo} alt={restaurant.name} fill sizes="96px" className="object-cover" />
            <AvatarFallback className="rounded-2xl">{restaurant.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="space-y-1 mt-4">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">{restaurant.name}</h1>
            <p className="text-sm text-muted-foreground font-medium">التقييمات وآراء العملاء</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-right">
                <div className="flex flex-col items-center sm:items-end">
                  <span className="text-5xl font-black text-gray-900">{averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">/ 5</span>
                  <div className="flex justify-center sm:justify-end mt-1" dir="ltr">
                    <StarRating rating={averageRating} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">بناءً على {reviews.length} تقييم</p>
                </div>
                <div className="w-full sm:max-w-[240px] space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs w-8 text-center shrink-0">
                        {star} <Star className="h-3 w-3 inline-block" />
                      </span>
                      <Progress
                        value={reviews.length > 0 ? (distribution[star as keyof typeof distribution] / reviews.length) * 100 : 0}
                        className="h-2 flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 px-4 sm:px-6 py-4">
              <Button
                onClick={() => setRatingDialogOpen(true)}
                className="w-full h-12 rounded-2xl font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                <Star className="ml-2 h-4 w-4" />
                أضف تقييمك
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 px-1">
              <h2 className="text-xl font-black text-gray-900">أحدث التعليقات</h2>
              <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-gray-200" />
            </div>

            {reviews.filter((r) => r.comment).length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
                <Star className="h-12 w-12 text-amber-200 mx-auto mb-3" />
                <p className="font-bold text-gray-700">لا توجد تعليقات مكتوبة بعد.</p>
                <p className="text-sm text-muted-foreground mt-1">كن أول من يشارك رأيه!</p>
                <Button
                  variant="outline"
                  className="mt-6 rounded-xl"
                  onClick={() => setRatingDialogOpen(true)}
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  أضف تقييمك
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews
                  .filter((r) => r.comment)
                  .map((review) => (
                    <div
                      key={review.id}
                      className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all p-4 sm:p-5 text-right"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <Avatar className="h-10 w-10 shrink-0 rounded-xl bg-gray-100">
                          <AvatarFallback className="rounded-xl text-muted-foreground text-sm">ر</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <StarRating rating={review.rating} size="sm" />
                            <p className="text-xs text-muted-foreground">
                              {review.created_at
                                ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ar })
                                : ''}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <RatingDialog
        open={isRatingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        onSubmit={handleRateSubmit}
        isSubmitting={isSubmittingRating}
        restaurantName={restaurant.name}
      />
    </>
  );
}
