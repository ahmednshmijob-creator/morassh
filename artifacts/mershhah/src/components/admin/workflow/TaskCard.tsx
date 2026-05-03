'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Flag, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import type { Task } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface TaskCardProps {
  task: Task;
  onTaskUpdate: () => void;
}

const priorityConfig = {
    high: { label: 'عالية', color: 'bg-red-500/20 text-red-700', iconColor: 'text-red-500' },
    medium: { label: 'متوسطة', color: 'bg-amber-500/20 text-amber-700', iconColor: 'text-amber-500' },
    low: { label: 'منخفضة', color: 'bg-blue-500/20 text-blue-700', iconColor: 'text-blue-500' },
} as const;

const statusConfig = {
    todo: { label: 'مهام جديدة' },
    'in-progress': { label: 'قيد التنفيذ' },
    review: { label: 'للمراجعة' },
    done: { label: 'تم الإنجاز' },
}

const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'A';

export function TaskCard({ task, onTaskUpdate }: TaskCardProps) {
    const { toast } = useToast();
    const { label, color, iconColor } = priorityConfig[task.priority];

    const handleStatusChange = async (newStatus: Task['status']) => {
        try {
            const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
            if (error) throw error;
            toast({ title: 'تم تحديث حالة المهمة' });
            onTaskUpdate();
        } catch (error: any) {
            toast({ title: 'خطأ', description: 'لم نتمكن من تحديث المهمة', variant: 'destructive' });
        }
    };

  return (
    <Card className="group cursor-grab active:cursor-grabbing hover:bg-muted/70 transition-colors">
        <CardContent className="p-4 space-y-2">
            <div className="flex justify-between items-start mb-2">
                <Badge className={`text-xs font-bold ${color}`}>
                    <Flag className={`h-3 w-3 ml-1 ${iconColor}`} />
                    {label}
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuSub>
                            <DropdownMenuSubTrigger>تغيير الحالة</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuRadioGroup value={task.status} onValueChange={(val) => handleStatusChange(val as Task['status'])}>
                                        {Object.entries(statusConfig).map(([key, value]) => (
                                            <DropdownMenuRadioItem key={key} value={key}>{value.label}</DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled><Pencil className="h-4 w-4 ml-2" /> تعديل المهمة</DropdownMenuItem>
                        <DropdownMenuItem disabled className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 ml-2" /> حذف المهمة</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <p className="font-semibold text-sm">{task.title}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            <div className="flex items-center justify-between pt-2">
                <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={task.assigneeAvatar || undefined} alt={task.assigneeName} />
                    <AvatarFallback>{getInitials(task.assigneeName)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString('ar-SA') : ''}
                </span>
            </div>
        </CardContent>
    </Card>
  )
}
