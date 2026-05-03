'use client';

import { useState, useEffect } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { AdminUsersTable } from "@/components/admin/team/AdminUsersTable";
import { AddAdminDialog } from "@/components/admin/team/AddAdminDialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function TeamManagementPage() {
    const [admins, setAdmins] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchAdmins = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'admin');
        if (error) {
            toast({ variant: "destructive", title: "خطأ في جلب المسؤولين", description: error.message });
        } else {
            setAdmins((data || []) as Profile[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        setIsLoading(true);
        fetchAdmins();

        const channel = supabase.channel('admin_profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAdmins)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <PageHeader title="إدارة الفريق" description="إدارة حسابات المسؤولين وصلاحياتهم في المنصة." >
                    <Skeleton className="h-10 w-32" />
                </PageHeader>
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="إدارة الفريق"
                description="إدارة حسابات المسؤولين وصلاحياتهم في المنصة."
            >
                <AddAdminDialog onAdminAdded={fetchAdmins}>
                    <Button>
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة مسؤول جديد
                    </Button>
                </AddAdminDialog>
            </PageHeader>

            <AdminUsersTable admins={admins} onActionComplete={fetchAdmins} />
        </div>
    );
}
