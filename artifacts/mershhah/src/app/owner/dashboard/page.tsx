'use client';

import Analytics from "@/components/dashboard/Analytics";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";
import { useLanguage } from "@/components/shared/LanguageContext";

export default function OwnerDashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { locale } = useLanguage();
  const isRTL = locale === 'ar';

  const handleRefresh = () => {
    startTransition(() => {
        setRefreshKey(prevKey => prevKey + 1);
        toast({ title: isRTL ? "جاري تحديث البيانات..." : "Refreshing data..." });
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={isRTL ? "لوحة التحكم" : "Dashboard"}
        description={isRTL ? "نظرة سريعة على أداء مشروعك." : "A quick overview of your business performance."}
      >
        <Button variant="outline" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            {isRTL ? "تحديث" : "Refresh"}
        </Button>
      </PageHeader>
      <AnnouncementBanner />
      <Analytics key={refreshKey} />
    </div>
  );
}
