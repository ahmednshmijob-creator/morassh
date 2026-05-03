'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useRouter } from '@/lib/navigation';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowRight, User as UserIcon, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SupportTicket } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const statusText: any = {
  open: 'جديدة',
  contacted: 'تم التواصل',
  resolved: 'تم الحل',
  closed: 'مغلقة',
};

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTicket = async () => {
    if (!ticketId) return;
    const { data } = await supabase.from('support_tickets').select('*').eq('id', ticketId).single();
    setTicket(data as SupportTicket | null);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTicket();
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${ticketId}` }, fetchTicket)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase.from('support_tickets').update({ status: newStatus }).eq('id', ticketId);
    if (error) {
      toast({ title: 'خطأ', description: 'لم نتمكن من تحديث الحالة.', variant: 'destructive' });
    } else {
      toast({ title: 'تم تحديث حالة التذكرة' });
      fetchTicket();
    }
  };

  const loading = isLoading || isUserLoading;

  if (loading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  if (!ticket) return <div className="p-6 text-center"><h2 className="text-xl font-bold">التذكرة غير موجودة</h2></div>;
  if (user?.role !== 'admin' && user?.restaurantId !== ticket.restaurant_id) {
    return <div className="p-6 text-center text-destructive">غير مصرح لك بعرض هذه التذكرة.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={ticket.subject} description={`تذكرة من ${ticket.name}`}>
        <Button onClick={() => router.back()} variant="outline"><ArrowRight className="ml-2 h-4 w-4" /> العودة للتذاكر</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <Card className="lg:col-span-1 sticky top-20">
          <CardHeader><CardTitle>تفاصيل التذكرة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>تغيير الحالة</Label>
              <Select value={ticket.status} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">جديدة</SelectItem>
                  <SelectItem value="contacted">تم التواصل</SelectItem>
                  <SelectItem value="resolved">تم الحل</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" />العميل</h4>
              <p className="text-sm text-foreground">{ticket.name}</p>
              <p className="text-xs text-muted-foreground">{ticket.email}</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />تاريخ الإنشاء</h4>
              <p className="text-sm text-foreground">{ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt as any), { addSuffix: true, locale: ar }) : ''}</p>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-3">
          <Card>
            <CardHeader><CardTitle>محتوى التذكرة</CardTitle></CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed p-4 bg-muted rounded-md">{ticket.message}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
