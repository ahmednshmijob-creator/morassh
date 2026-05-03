'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { Announcement } from '@/lib/types';
import { AnnouncementsTable } from '@/components/admin/announcements/AnnouncementsTable';
import { EditAnnouncementDialog } from '@/components/admin/announcements/EditAnnouncementDialog';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      setAnnouncements((data || []) as Announcement[]);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'خطأ في جلب الإعلانات', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('announcements-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="إدارة الإعلانات" description="إنشاء وتعديل الإعلانات التي تظهر للمستخدمين.">
          <Skeleton className="h-10 w-32" />
        </PageHeader>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="إدارة الإعلانات" description="إنشاء وتعديل الإعلانات التي تظهر للمستخدمين في لوحة التحكم.">
        <EditAnnouncementDialog onSave={fetchAnnouncements}>
          <Button>
            <PlusCircle className="ml-2 h-4 w-4" />
            إنشاء إعلان جديد
          </Button>
        </EditAnnouncementDialog>
      </PageHeader>
      <AnnouncementsTable announcements={announcements} onActionComplete={fetchAnnouncements} />
    </div>
  );
}
