'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendHorizonal, Paperclip, Loader2, FileIcon, Download } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FormEvent, useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, ChatSession } from '@/lib/types';

export default function OwnerSupportPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatId = user?.id;

  useEffect(() => {
    if (!chatId || !user) return;

    const initChat = async () => {
      const { data: existing } = await supabase.from('chats').select('id, ownerHasUnread').eq('id', chatId).single();

      if (!existing) {
        await supabase.from('chats').upsert({
          id: chatId,
          ownerId: user.id,
          ownerName: user.restaurant_name || user.full_name || 'New User',
          ownerLogo: user.logo || null,
          lastMessageTimestamp: new Date().toISOString(),
          adminHasUnread: false,
          ownerHasUnread: false,
        });
      } else if (existing.ownerHasUnread) {
        await supabase.from('chats').update({ ownerHasUnread: false }).eq('id', chatId);
      }
    };

    initChat();

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });
      setMessages((data || []) as ChatMessage[]);
      setIsLoadingMessages(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`owner-chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, user]);

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent, file?: File) => {
    e.preventDefault();
    if ((message.trim() === '' && !file) || !chatId || !user) return;

    const messageText = message;
    setMessage('');
    setIsUploading(true);

    let attachmentData: Partial<ChatMessage> = {};

    try {
      if (file) {
        const filePath = `chat_attachments/${chatId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
        attachmentData = {
          attachment_url: urlData.publicUrl,
          attachment_filename: file.name,
          attachment_type: file.type.startsWith('image/') ? 'image' : 'file',
        };
      }

      const now = new Date().toISOString();

      await supabase.from('chat_messages').insert({
        id: crypto.randomUUID(),
        chat_id: chatId,
        senderId: user.id,
        senderRole: 'owner',
        text: messageText,
        timestamp: now,
        ...attachmentData,
      });

      await supabase.from('chats').upsert({
        id: chatId,
        lastMessage: file ? `ملف: ${file.name}` : messageText,
        lastMessageTimestamp: now,
        adminHasUnread: true,
        ownerHasUnread: false,
        ownerLogo: user.logo || null,
        ownerName: user.restaurant_name || user.full_name || 'New User',
      });
    } catch (error: any) {
      toast({ title: 'خطأ في الإرسال', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'حجم الملف كبير جداً', description: 'الرجاء اختيار ملف أصغر من 5 ميجابايت.', variant: 'destructive' });
        return;
      }
      handleSendMessage(e, file);
    }
  };

  const loading = isLoadingMessages || isUserLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      <PageHeader title="الدعم المباشر" description="تواصل مباشرةً مع فريق الدعم الفني لحل أي مشكلة تواجهك." />
      <Card className="flex-1 mt-4 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col p-4 min-h-0">
          <div className="flex-1 relative">
            <div className="absolute inset-0 overflow-y-auto space-y-4 pr-4">
              {loading && (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-3/4" />
                  <Skeleton className="h-12 w-3/4 ml-auto" />
                  <Skeleton className="h-12 w-3/4" />
                </div>
              )}
              {!loading && messages.map((msg) => {
                const isOwner = msg.senderRole === 'owner';
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isOwner ? 'justify-end' : 'justify-start'}`}>
                    {!isOwner && <Avatar className="h-8 w-8 shrink-0 self-end"><AvatarFallback>A</AvatarFallback></Avatar>}
                    <div className={`p-3 text-sm rounded-2xl max-w-[70%] relative ${isOwner ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                      {msg.attachment_url && (
                        <div className="mt-2">
                          {msg.attachment_type === 'image' ? (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                              <img src={msg.attachment_url} alt={msg.attachment_filename || 'Attachment'} width={200} height={200} className="rounded-md object-cover cursor-pointer" />
                            </a>
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-md ${isOwner ? 'bg-primary-foreground/10' : 'bg-background/50'} hover:bg-background/70`}>
                              <FileIcon className="h-5 w-5" />
                              <span className="text-sm underline">{msg.attachment_filename || 'تنزيل الملف'}</span>
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    {isOwner && (
                      <Avatar className="h-8 w-8 shrink-0 self-end">
                        <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user?.full_name)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
              {!loading && messages.length === 0 && (
                <p className="text-center text-muted-foreground pt-10">هنا بداية محادثتك مع الدعم الفني.</p>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2 border-t pt-4 shrink-0">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1"
              disabled={loading || !chatId || isUploading}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={loading || !chatId || isUploading}>
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </Button>
            <Button type="submit" disabled={loading || !chatId || (!message.trim()) || isUploading}>
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
