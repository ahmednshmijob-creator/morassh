'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { EditBranchDialog } from '@/components/dashboard/EditBranchDialog';
import { BranchesList } from '@/components/dashboard/BranchesList';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import type { Branch } from '@/lib/types';

export default function BranchesPage() {
  const { user, isLoading: userLoading } = useUser();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const restaurantId = user?.restaurantId ?? '';

  const fetchBranches = async () => {
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from('branches').select('*').eq('restaurant_id', restaurantId);
    setBranches((data || []) as Branch[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return; }
    fetchBranches();
    const channel = supabase
      .channel(`branches-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches', filter: `restaurant_id=eq.${restaurantId}` }, fetchBranches)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  if (userLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="إدارة الفروع" description="أضف وعُدّل فروع مطعمك من قائمة واحدة.">
        {restaurantId && (
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة فرع
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <BranchesList branches={branches} restaurantId={restaurantId} onChanged={fetchBranches} />
      )}

      {restaurantId && (
        <EditBranchDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          restaurantId={restaurantId}
          onSaved={() => { setAddOpen(false); fetchBranches(); }}
        />
      )}
    </div>
  );
}
