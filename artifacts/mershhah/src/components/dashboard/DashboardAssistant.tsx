'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, SendHorizonal, User, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { dashboardAssistant } from '@/ai/flows/dashboard-assistant-flow';
import { usePathname } from '@/lib/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import type { MenuItem as MenuItemType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  generatedImage?: string;
  suggestedAction?: {
      actionLabel: string;
      actionType: string;
      actionPayload: any;
  } | null;
}

export function DashboardAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, startThinking] = useTransition();
  const [pendingAction, setPendingAction] = useState<Message['suggestedAction']>(null);
  const [isExecutingAction, startExecutingAction] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { toast } = useToast();
  const { user } = useUser();
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMessages([{
        id: Date.now(),
        sender: 'bot',
        text: 'أهلاً بك! أنا رفيق دربك في منصة مرشح. كيف يمكنني مساعدتك اليوم؟',
      }]);
      setInput('');
      setPendingAction(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user?.restaurantId) {
      setMenuItems([]);
      return;
    }

    setIsFetchingData(true);

    const fetchMenuItems = async () => {
      const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', user.restaurantId);
      if (!error) setMenuItems((data || []) as MenuItemType[]);
      setIsFetchingData(false);
    };

    fetchMenuItems();

    const channel = supabase.channel('assistant_menu_items')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${user.restaurantId}` }, fetchMenuItems)
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isOpen, user?.restaurantId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setPendingAction(null);

    startThinking(async () => {
      try {
        if (user?.entitlements.planId === 'free' && !user.ai_trial_used) {
          await supabase.from('profiles').update({ ai_trial_used: true }).eq('id', user.uid);
        }

        const plainMenuItems = JSON.parse(JSON.stringify(menuItems));
        const response = await dashboardAssistant({
          question: currentInput,
          currentPage: pathname,
          menuItems: plainMenuItems,
        });

        const botMessage: Message = {
          id: Date.now() + 1,
          sender: 'bot',
          text: response.answer,
          generatedImage: response.generatedImage,
          suggestedAction: response.suggestedAction || null,
        };
        if (response.suggestedAction) setPendingAction(response.suggestedAction);
        setMessages((prev) => [...prev, botMessage]);
      } catch (error) {
        toast({ title: 'خطأ', description: 'حدث خطأ أثناء التواصل مع المساعد.', variant: 'destructive' });
        setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: "عفواً، واجهتني مشكلة. الرجاء المحاولة مرة أخرى." }]);
      }
    });
  };

  const handleConfirmAction = async () => {
      if (!pendingAction || !user?.restaurantId) return;

      startExecutingAction(async () => {
          try {
              if (pendingAction.actionType === 'UPDATE_MENU_ITEM') {
                  const { itemId, updates } = pendingAction.actionPayload;
                  const { error } = await supabase
                      .from('menu_items')
                      .update(updates)
                      .eq('id', itemId);
                  if (error) throw error;
                  toast({ title: 'تم بنجاح!', description: 'تم تنفيذ الإجراء بنجاح.' });

              } else if (pendingAction.actionType === 'BULK_UPDATE_MENU_ITEMS') {
                  const updatesArray = pendingAction.actionPayload as { itemId: string, updates: any }[];
                  if (!Array.isArray(updatesArray)) throw new Error('بيانات الإجراء الجماعي غير صالحة.');

                  await Promise.all(updatesArray.map(({ itemId, updates }) =>
                      supabase.from('menu_items').update(updates).eq('id', itemId)
                  ));

                  toast({ title: 'تم بنجاح!', description: `تم تحديث ${updatesArray.length} منتجات بنجاح.` });
              } else {
                  throw new Error('نوع الإجراء غير معروف.');
              }

              setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: 'ممتاز، تم تنفيذ طلبك بنجاح.' }]);
          } catch (error: any) {
              console.error("Failed to execute action:", error);
              toast({ title: 'خطأ', description: error.message || 'فشل تنفيذ الإجراء.', variant: 'destructive' });
          } finally {
              setPendingAction(null);
          }
      });
  };

  const finalInputDisabled = isThinking || isFetchingData || isExecutingAction;

  if (!user?.entitlements.canUseDashboardAgent) return null;

  return (
    <>
      <motion.div initial={{ scale: 0, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 1, type: 'spring' }} className="fixed bottom-8 right-8 z-50">
        <Button onClick={() => setIsOpen(true)} className="rounded-full h-16 w-16 shadow-lg">
          <Bot className="h-8 w-8" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-[99]" onClick={() => setIsOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 right-0 z-[100] h-full w-full max-h-[80vh] sm:h-auto sm:max-h-[600px] sm:max-w-sm sm:bottom-8 sm:right-8 rounded-t-2xl sm:rounded-2xl bg-card border shadow-2xl flex flex-col"
          >
            <header className="p-4 border-b flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full"><Bot className="h-6 w-6 text-primary" /></div>
              <div>
                <h3 className="font-bold">رفيق الدرب</h3>
                <p className="text-xs text-muted-foreground">مساعدك الذكي في مرشح</p>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => {
                  const isLastMessage = index === messages.length - 1;
                  return (
                    <div key={msg.id} className={cn("flex gap-2", msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.sender === 'bot' && <Bot className="h-5 w-5 text-primary shrink-0 mt-1" />}
                      <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        {msg.text}
                        {msg.generatedImage && (
                            <div className="mt-2 border rounded-lg overflow-hidden bg-background p-1">
                                <img src={msg.generatedImage} alt="Generated menu item" className="w-full aspect-square object-contain rounded-md" />
                            </div>
                        )}
                        {isLastMessage && pendingAction && (
                            <div className="mt-3 border-t pt-3">
                                <Button onClick={handleConfirmAction} disabled={isExecutingAction} size="sm" className="gap-2">
                                    {isExecutingAction ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4" />}
                                    {pendingAction.actionLabel}
                                </Button>
                            </div>
                        )}
                      </div>
                       {msg.sender === 'user' && <User className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />}
                    </div>
                  )
              })}
               {isThinking && (
                 <div className="flex justify-start">
                    <div className="flex gap-2 items-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span>يفكر...</span>
                    </div>
                 </div>
               )}
            </div>

            <footer className="p-4 border-t">
              <div className="relative">
                <Input
                  placeholder="اسألني عن أي شيء في المنصة..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={finalInputDisabled}
                />
                <Button onClick={handleSend} disabled={finalInputDisabled || !input.trim()} size="icon" className="absolute left-1.5 top-1/2 -translate-y-1/2 h-8 w-8">
                  <SendHorizonal className="h-4 w-4" />
                </Button>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
