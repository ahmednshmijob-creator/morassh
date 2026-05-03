'use client';

import { useState, useEffect } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { EditToolDialog } from "@/components/admin/store/EditToolDialog";
import { ToolsTable } from "@/components/admin/store/ToolsTable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Link } from "wouter";

export default function StoreManagementPage() {
    const [tools, setTools] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchTools = async () => {
        const { data, error } = await supabase.from('tools').select('*');
        if (error) {
            toast({ title: "فشل تحميل الأدوات", variant: "destructive", description: error.message });
        } else {
            setTools(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        setIsLoading(true);
        fetchTools();

        const channel = supabase.channel('admin_tools')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tools' }, fetchTools)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (isLoading) {
        return (
             <div className="space-y-6" dir="rtl">
                <PageHeader
                    title="إدارة متجر الأدوات"
                    description="إضافة وتعديل الأدوات المتاحة للمشتركين."
                />
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6" dir="rtl">
            <PageHeader
                title="إدارة متجر الأدوات"
                description="إضافة وتعديل الأدوات المتاحة في المتجر للمشتركين."
            >
                <div className="flex gap-2 flex-row-reverse">
                    <EditToolDialog onSave={fetchTools} allTools={tools}>
                        <Button variant="outline" size="sm" className="gap-1 flex-row-reverse">
                            إضافة أداة
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </EditToolDialog>
                    <Button asChild variant="ghost" size="sm" className="flex-row-reverse">
                        <Link href="/admin/store/developers">
                            دليل المطورين
                        </Link>
                    </Button>
                </div>
            </PageHeader>

            <ToolsTable tools={tools} onActionComplete={fetchTools} />
        </div>
    );
}
