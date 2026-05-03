'use client';

import { useState, useTransition, useEffect } from 'react';
import PageHeader from "@/components/dashboard/PageHeader";
import { OfferCard } from "@/components/dashboard/OfferCard";
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditOfferDialog } from '@/components/dashboard/EditOfferDialog';
import { supabase } from '@/lib/supabase';

export default function OffersPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [offerToDelete, setOfferToDelete] = useState<any | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const { toast } = useToast();

  const [offers, setOffers] = useState<any[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const fetchOffers = async (restId: string) => {
    const { data, error } = await supabase.from('offers').select('*').eq('restaurant_id', restId);
    if (!error) setOffers(data || []);
  };

  useEffect(() => {
    if (!isUserLoading && user?.restaurantId) {
      const restId = user.restaurantId;
      setRestaurantId(restId);
      setIsFetchingData(true);
      fetchOffers(restId).finally(() => setIsFetchingData(false));

      const channel = supabase
        .channel(`offers-${restId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'offers', filter: `restaurant_id=eq.${restId}` }, () => fetchOffers(restId))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    } else if (!isUserLoading) {
      setIsFetchingData(false);
      return;
    }
    return;
  }, [isUserLoading, user]);

  const loadingData = isFetchingData || isUserLoading;

  const handleDelete = () => {
    if (!offerToDelete || !restaurantId) return;
    startDelete(async () => {
      const { error } = await supabase.from('offers').delete().eq('id', offerToDelete.id);
      if (error) {
        toast({ variant: "destructive", title: "خطأ في الحذف", description: error.message });
      } else {
        toast({ title: "تم حذف العرض بنجاح" });
        fetchOffers(restaurantId);
      }
      setOfferToDelete(null);
    });
  };

  return (
    <>
      <div className="space-y-8">
        <PageHeader title="إدارة العروض" description="سوّ عروض ترويجية عشان تجذب زباين أكثر.">
          <EditOfferDialog restaurantId={restaurantId!} userId={user?.uid} onSave={() => restaurantId && fetchOffers(restaurantId)}>
            <Button disabled={loadingData || !restaurantId}>
              <PlusCircle className="ml-2 h-4 w-4" />
              سوّ عرض جديد
            </Button>
          </EditOfferDialog>
        </PageHeader>

        {loadingData && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card><CardContent className="h-64 animate-pulse bg-muted rounded-lg"></CardContent></Card>
            <Card><CardContent className="h-64 animate-pulse bg-muted rounded-lg"></CardContent></Card>
            <Card><CardContent className="h-64 animate-pulse bg-muted rounded-lg"></CardContent></Card>
          </div>
        )}

        {!loadingData && offers.length === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center gap-2 h-48 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">لا توجد عروض حاليًا</p>
                <p className="text-sm text-muted-foreground">عند إضافة عروض جديدة، ستظهر هنا.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {!loadingData && restaurantId && offers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onDelete={() => setOfferToDelete(offer)}
              restaurantId={restaurantId}
              onActionCompletion={() => fetchOffers(restaurantId)}
            />
          ))}
        </div>
      </div>

      <AlertDialog open={!!offerToDelete} onOpenChange={(open) => !open && setOfferToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف عرض "{offerToDelete?.title}" نهائياً.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
