'use client';

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    MoreHorizontal,
    Shield,
    Mail,
    Trash2,
    KeyRound,
    Crown,
    Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import type { Profile } from "@/lib/types";
import { useUser } from "@/hooks/useUser";
import { EditAdminDialog } from "./EditAdminDialog";
import { supabase } from "@/lib/supabase";

interface AdminUsersTableProps {
  admins: Profile[];
  onActionComplete: () => void;
}

const SUPER_ADMIN_EMAIL = 'ahmedsupsa@gmail.com';

export function AdminUsersTable({ admins, onActionComplete }: AdminUsersTableProps) {
  const { user: currentUser } = useUser();
  const [editingAdmin, setEditingAdmin] = useState<Profile | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<Profile | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSendingReset, startResetTransition] = useTransition();

  const handleResetPassword = (admin: Profile) => {
    startResetTransition(async () => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(admin.email);
            if (error) throw error;
            toast({
                title: "تم إرسال الرابط",
                description: `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${admin.email}.`,
            });
        } catch (error: any) {
            toast({
                title: "خطأ",
                description: "لم نتمكن من إرسال الرابط.",
                variant: "destructive",
            });
        }
    });
  };

  const handleDelete = () => {
    if (!adminToDelete) return;

    startDeleteTransition(async () => {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', adminToDelete.id);
        if (error) throw error;
        toast({
          title: "تم حذف المسؤول",
          description: `تم حذف ملف ${adminToDelete.full_name} من قاعدة البيانات.`,
        });
        onActionComplete();
      } catch (error: any) {
        toast({
          title: "خطأ في الحذف",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setAdminToDelete(null);
      }
    });
  };

  return (
    <>
    <div className="hidden md:block">
        <Card>
        <CardContent className="p-0">
            <Table dir="rtl">
            <TableHeader>
                <TableRow>
                <TableHead className="text-right">الاسم الكامل</TableHead>
                <TableHead className="text-right">البريد الإلكتروني</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {admins.length > 0 ? admins.map((admin) => {
                const isCurrentUser = admin.id === currentUser?.id;
                const isSuperAdmin = admin.email === SUPER_ADMIN_EMAIL;
                const canPerformActions = !isCurrentUser && !isSuperAdmin;

                return (
                    <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                        <span>{admin.full_name}</span>
                        {isCurrentUser && <Badge variant="secondary" className="mr-2">أنت</Badge>}
                        {isSuperAdmin && (
                            <Badge variant="outline" className="mr-2 border-amber-500 text-amber-600">
                                <Crown className="ml-1 h-3 w-3" />
                                المدير الأساسي
                            </Badge>
                        )}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{admin.email}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={admin.account_status === 'active' ? 'default' : 'secondary'} className="bg-green-100 text-green-700">
                        نشط
                        </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!canPerformActions}>
                            { isSendingReset && <Loader2 className="h-4 w-4 animate-spin"/>}
                            { !isSendingReset && <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => setEditingAdmin(admin)}>
                            <Shield className="ml-2 h-4 w-4" />
                            تعديل الصلاحيات
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleResetPassword(admin)}>
                            <KeyRound className="ml-2 h-4 w-4" />
                            إعادة تعيين كلمة المرور
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => setAdminToDelete(admin)}>
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف المسؤول
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                )
                }) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                    لا يوجد مسؤولون آخرون.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </CardContent>
        </Card>
    </div>
    <div className="md:hidden space-y-4">
        {admins.map((admin) => {
             const isCurrentUser = admin.id === currentUser?.id;
             const isSuperAdmin = admin.email === SUPER_ADMIN_EMAIL;
             const canPerformActions = !isCurrentUser && !isSuperAdmin;

            return (
            <Card key={admin.id}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{admin.full_name}</CardTitle>
                         <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!canPerformActions} className="-mt-2 -mr-2">
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditingAdmin(admin)}>
                                <Shield className="ml-2 h-4 w-4" /> تعديل الصلاحيات
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleResetPassword(admin)}>
                                <KeyRound className="ml-2 h-4 w-4" /> إعادة تعيين كلمة المرور
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => setAdminToDelete(admin)}>
                                <Trash2 className="ml-2 h-4 w-4" /> حذف
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                     <CardDescription>
                        {isCurrentUser && <Badge variant="secondary" className="mr-2">أنت</Badge>}
                        {isSuperAdmin && <Badge variant="outline" className="mr-2 border-amber-500 text-amber-600"><Crown className="ml-1 h-3 w-3" />المدير الأساسي</Badge>}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" /><span>{admin.email}</span>
                    </div>
                </CardContent>
                 <CardFooter>
                    <Badge variant={admin.account_status === 'active' ? 'default' : 'secondary'} className="bg-green-100 text-green-700">نشط</Badge>
                </CardFooter>
            </Card>
        )})}
         {admins.length === 0 && <Card><CardContent className="h-24 text-center flex items-center justify-center">لا يوجد مسؤولون آخرون.</CardContent></Card>}
    </div>

    {editingAdmin && (
        <EditAdminDialog
            admin={editingAdmin}
            open={!!editingAdmin}
            onOpenChange={(open) => !open && setEditingAdmin(null)}
            onAdminUpdated={() => {
                setEditingAdmin(null);
                onActionComplete();
            }}
        />
    )}

    <AlertDialog open={!!adminToDelete} onOpenChange={(open) => !open && setAdminToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                سيتم حذف ملف المسؤول "{adminToDelete?.full_name}" من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : "نعم، قم بالحذف"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
