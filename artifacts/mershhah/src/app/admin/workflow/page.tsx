'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Task } from '@/lib/types';
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddTaskDialog } from '@/components/admin/workflow/AddTaskDialog';
import { TaskCard } from '@/components/admin/workflow/TaskCard';
import { useUser } from '@/hooks/useUser';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const columns: { id: Task['status']; title: string }[] = [
  { id: 'todo', title: 'مهام جديدة' },
  { id: 'in-progress', title: 'قيد التنفيذ' },
  { id: 'review', title: 'للمراجعة' },
  { id: 'done', title: 'تم الإنجاز' },
];

export default function WorkflowPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [admins, setAdmins] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useUser();
    const [myTasksOnly, setMyTasksOnly] = useState(false);

    const fetchAdmins = useCallback(async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'admin');
        if (error) {
            toast({ variant: "destructive", title: "خطأ في جلب المسؤولين", description: error.message });
        } else {
            setAdmins((data || []) as Profile[]);
        }
    }, [toast]);

    const fetchTasks = useCallback(async () => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('createdAt', { ascending: false });
        if (error) {
            toast({ variant: "destructive", title: "خطأ في جلب المهام", description: error.message });
        } else {
            setTasks((data || []) as Task[]);
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    useEffect(() => {
        fetchTasks();

        const channel = supabase.channel('admin_tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchTasks]);

    const filteredTasks = useMemo(() => {
        if (!user) return [];
        if (myTasksOnly) {
            return tasks.filter(task => task.assigneeId === user.uid);
        }
        return tasks;
    }, [tasks, myTasksOnly, user]);

    const groupedTasks = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            (acc[task.status] = acc[task.status] || []).push(task);
            return acc;
        }, {} as Record<Task['status'], Task[]>);
    }, [filteredTasks]);

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <PageHeader title="سير العمل" description="نظّم مهام فريقك وتتبع التقدم المحرز." />
                 <div className="flex-1 overflow-x-auto overflow-y-hidden py-6">
                    <div className="flex gap-6 items-start">
                        {columns.map(col => (
                            <div key={col.id} className="w-80 shrink-0">
                                <Skeleton className="h-8 w-3/4 mb-4" />
                                <div className="space-y-4 h-full bg-muted/50 p-4 rounded-xl border">
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title="سير العمل"
                description="نظّم مهام فريقك وتتبع التقدم المحرز في المشاريع."
            >
                <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch id="my-tasks-only" checked={myTasksOnly} onCheckedChange={setMyTasksOnly} />
                    <Label htmlFor="my-tasks-only">عرض مهامي فقط</Label>
                </div>
            </PageHeader>

            <div className="flex-1 overflow-x-auto overflow-y-hidden py-6">
                <div className="flex gap-6 items-start">
                    {columns.map((col) => (
                        <div key={col.id} className="w-80 shrink-0">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    {col.title}
                                    <Badge variant="secondary">{(groupedTasks[col.id] || []).length}</Badge>
                                </h2>
                            </div>
                            <div className="space-y-4 h-full bg-muted/50 p-4 rounded-xl border">
                                {(groupedTasks[col.id] || []).map(task => (
                                    <TaskCard key={task.id} task={task} onTaskUpdate={fetchTasks} />
                                ))}
                                {(!groupedTasks[col.id] || groupedTasks[col.id].length === 0) && (
                                    <div className="text-center text-sm text-muted-foreground pt-10">لا توجد مهام هنا.</div>
                                )}
                                <AddTaskDialog admins={admins} status={col.id} onTaskAdded={fetchTasks}>
                                    <Button variant="outline" className="w-full mt-4">
                                        <PlusCircle className="ml-2 h-4 w-4"/>
                                        إضافة مهمة جديدة
                                    </Button>
                                </AddTaskDialog>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
