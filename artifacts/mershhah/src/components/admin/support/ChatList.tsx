'use client';

import { useEffect, useState, useTransition } from 'react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChatSession } from '@/lib/types';
import { Link } from 'wouter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { MessageSquare, Search, File, ImageIcon, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { usePathname } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { StorageImage } from '@/components/shared/StorageImage';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export function ChatList() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('lastMessageTimestamp', { ascending: false });
      if (!error && data) setSessions(data as ChatSession[]);
      setIsLoading(false);
    };

    fetchSessions();

    const channel = supabase
      .channel('chats-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchSessions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDeleteRequest = (session: ChatSession) => setSessionToDelete(session);

  const handleDeleteConfirm = () => {
    if (!sessionToDelete) return;
    startDeleteTransition(async () => {
      try {
        await supabase.from('chat_messages').delete().eq('chat_id', sessionToDelete.id);
        await supabase.from('chats').delete().eq('id', sessionToDelete.id);
        toast({ title: 'تم حذف المحادثة' });
      } catch (e: any) {
        toast({ title: 'خطأ في الحذف', description: e.message, variant: 'destructive' });
      } finally {
        setSessionToDelete(null);
      }
    });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const filteredSessions = sessions.filter((session) =>
    session.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderLastMessage = (session: ChatSession) => {
    if (session.lastMessage?.startsWith('ملف:')) {
      const isImage = session.lastMessage.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/);
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isImage ? <ImageIcon className="h-3.5 w-3.5 shrink-0" /> : <File className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{session.lastMessage.replace('ملف:', '').trim()}</span>
        </div>
      );
    }
    return <p className="text-xs text-muted-foreground truncate">{session.lastMessage || 'لا توجد رسائل...'}</p>;
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background border-r">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">صندوق الوارد</h2>
          <div className="relative mt-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن محادثة..."
              className="pr-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-[76px] w-full" />
              <Skeleton className="h-[76px] w-full" />
              <Skeleton className="h-[76px] w-full" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center gap-2 h-full p-4 text-muted-foreground">
              <MessageSquare className="h-12 w-12" />
              <h3 className="text-lg font-semibold">لا توجد محادثات</h3>
            </div>
          ) : (
            <div className="divide-y">
              {filteredSessions.map((session) => {
                const isActive = pathname === `/admin/support/${session.id}`;
                const ts = session.lastMessageTimestamp;
                const tsDate = ts
                  ? typeof ts === 'string'
                    ? new Date(ts)
                    : ts.seconds
                    ? new Date(ts.seconds * 1000)
                    : new Date(ts)
                  : null;

                return (
                  <div
                    key={session.id}
                    className={cn(
                      'relative flex items-center group/item',
                      isActive ? 'bg-muted' : 'hover:bg-muted/50'
                    )}
                  >
                    <Link href={`/admin/support/${session.id}`} className="flex-1 p-4 flex items-center gap-3">
                      <Avatar className="h-11 w-11 border">
                        <StorageImage imagePath={session.ownerLogo} alt={session.ownerName || ''} fill className="object-cover" sizes="44px" />
                        <AvatarFallback className="text-base bg-muted text-foreground font-bold">
                          {getInitials(session.ownerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-sm truncate">{session.ownerName}</h3>
                          {tsDate && (
                            <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(tsDate, { addSuffix: true, locale: ar })}
                            </p>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <div className="flex-1 overflow-hidden pr-4">{renderLastMessage(session)}</div>
                          {session.adminHasUnread && (
                            <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0" />
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteRequest(session)}
                          >
                            <Trash2 className="ml-2 h-4 w-4" /> حذف المحادثة
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذه المحادثة وجميع رسائلها بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'نعم، قم بالحذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
