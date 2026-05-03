'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Application } from "@/lib/types";
import { ApplicationsTable } from "@/components/admin/applications/ApplicationsTable";
import { EditApplicationDialog } from "@/components/admin/applications/EditApplicationDialog";

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchApplications = async () => {
        const { data, error } = await supabase.from('applications').select('*');
        if (error) {
            toast({ variant: "destructive", title: "خطأ في جلب التطبيقات", description: error.message });
        } else {
            setApplications((data || []) as Application[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        setIsLoading(true);
        fetchApplications();

        const channel = supabase.channel('admin_applications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchApplications)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <PageHeader title="إدارة التطبيقات" description="إدارة التطبيقات الخارجية التي يمكن للمطاعم ربطها.">
                    <Skeleton className="h-10 w-36" />
                </PageHeader>
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="إدارة التطبيقات"
                description="إدارة التطبيقات الخارجية التي يمكن للمطاعم ربطها (توصيل, ولاء, دفع)."
            >
                <EditApplicationDialog onSave={fetchApplications}>
                    <Button>
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة تطبيق جديد
                    </Button>
                </EditApplicationDialog>
            </PageHeader>
            <ApplicationsTable applications={applications} onActionComplete={fetchApplications} />
        </div>
    );
}
