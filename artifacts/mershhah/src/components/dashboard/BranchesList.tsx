'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, MapPin, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditBranchDialog } from './EditBranchDialog';
import type { Branch } from '@/lib/types';

interface BranchesListProps {
  branches: Branch[];
  restaurantId: string;
  onChanged?: () => void;
}

export function BranchesList({ branches, restaurantId, onChanged }: BranchesListProps) {
  const { toast } = useToast();
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteBranch || !restaurantId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', deleteBranch.id)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
      toast({ title: 'تم حذف الفرع' });
      onChanged?.();
      setDeleteBranch(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'خطأ في الحذف', description: msg });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {branches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MapPin className="mb-2 h-10 w-10 opacity-50" />
              <p>لا توجد فروع بعد.</p>
              <p className="text-sm">اضغط &quot;إضافة فرع&quot; لبدء الإضافة.</p>
            </CardContent>
          </Card>
        ) : (
          branches.map((branch) => (
            <Card key={branch.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{branch.name}</p>
                    <p className="text-sm text-muted-foreground">{branch.city} · {branch.district}</p>
                    {branch.address && <p className="mt-1 text-sm text-muted-foreground">{branch.address}</p>}
                    {branch.phone && (
                      <a href={`tel:${branch.phone}`} className="mt-1 flex items-center gap-1 text-sm text-primary">
                        <Phone className="h-3 w-3" />{branch.phone}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                      {branch.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setEditBranch(branch)} aria-label="تعديل">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteBranch(branch)} aria-label="حذف">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <EditBranchDialog
        open={Boolean(editBranch)}
        onOpenChange={(open) => !open && setEditBranch(null)}
        branch={editBranch}
        restaurantId={restaurantId}
        onSaved={() => { setEditBranch(null); onChanged?.(); }}
      />

      <AlertDialog open={Boolean(deleteBranch)} onOpenChange={(o) => !o && setDeleteBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الفرع</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف &quot;{deleteBranch?.name}&quot;؟ لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
