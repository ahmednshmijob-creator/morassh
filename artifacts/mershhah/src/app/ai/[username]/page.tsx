"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'wouter';
import { useRouter } from '@/lib/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizonal, User, ChevronRight, Utensils, Info, MessageCircle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getPublicPage } from '@/lib/public-pages';
import type { AiMessage, MenuItem, Offer } from '@/lib/types';
import { restaurantChat } from '@/ai/flows/restaurant-chat-flow';
import { Link } from 'wouter';
import { StorageImage } from '@/components/shared/StorageImage';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AiAssistantPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [branches, setBranches] = useState<Array<{ id?: string; name?: string; address?: string; city?: string; district?: string; opening_hours?: string; phone?: string; google_maps_url?: string }>>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingLength, setStreamingLength] = useState(0);

  useEffect(() => {
    let sid = localStorage.getItem(`mershah-session-${username}`);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(`mershah-session-${username}`, sid);
    }
    setSessionId(sid);
  }, [username]);

  useEffect(() => {
    if (!username || !sessionId) return;

    const fetchRestaurantData = async () => {
      setLoading(true);
      try {
        const data = await getPublicPage(username);
        if (data?.restaurant) {
          setRestaurant(data.restaurant);
          setMenuItems(Array.isArray(data.menu) ? (data.menu as MenuItem[]) : []);
          setOffers(Array.isArray(data.offers) ? (data.offers as Offer[]) : []);
          setBranches(Array.isArray(data.branches) ? data.branches : []);
          setMessages([
            { id: '1', sender: 'bot', text: "أنا رفيقك الذكي. كيف أقدر أساعدك اليوم؟", timestamp: new Date() }
          ]);
          setLoading(false);
          return;
        }

        const { data: rest } = await supabase
          .from('restaurants')
          .select('*')
          .eq('username', username)
          .limit(1)
          .single();

        if (!rest) {
          setRestaurant(null);
          setLoading(false);
          return;
        }

        setRestaurant(rest);

        const [menuRes, offersRes, branchesRes] = await Promise.all([
          supabase.from('menu_items').select('*').eq('restaurant_id', rest.id),
          supabase.from('offers').select('*').eq('restaurant_id', rest.id),
          supabase.from('branches').select('*').eq('restaurant_id', rest.id).eq('status', 'active'),
        ]);

        setMenuItems((menuRes.data || []) as MenuItem[]);
        setOffers((offersRes.data || []) as Offer[]);
        setBranches(branchesRes.data || []);

        setMessages([
          { id: '1', sender: 'bot', text: "أنا رفيقك الذكي. كيف أقدر أساعدك اليوم؟", timestamp: new Date() }
        ]);
      } catch (error) {
        console.error("Error fetching restaurant data", error);
        setRestaurant(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [username, sessionId]);

  useEffect(() => {
    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    };
    scrollToBottom();
  }, [messages, isTyping, streamingLength]);

  useEffect(() => {
    if (!streamingMessageId || !restaurant || !sessionId) return;
    const msg = messages.find((m) => m.id === streamingMessageId);
    if (!msg || msg.sender !== 'bot') return;
    const fullText = msg.text || '';
    if (fullText.length === 0) {
      setStreamingMessageId(null);
      return;
    }

    const chunk = 2;
    const interval = 25;
    const timer = setInterval(() => {
      setStreamingLength((prev) => {
        const next = Math.min(prev + chunk, fullText.length);
        if (next >= fullText.length) {
          clearInterval(timer);
          supabase.from('ai_session_messages').insert({
            session_id: sessionId,
            restaurant_id: restaurant.id,
            sender: 'bot',
            text: fullText,
            created_at: new Date().toISOString(),
          }).then(() => {});
          setStreamingMessageId(null);
          return fullText.length;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [streamingMessageId, restaurant?.id, sessionId, messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || !restaurant) return;

    const userMsgContent = input;
    const userMsg: AiMessage = { id: Date.now().toString(), sender: 'user', text: userMsgContent, timestamp: new Date(), session_id: sessionId };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      await supabase.from('ai_session_messages').insert({
        session_id: sessionId,
        restaurant_id: restaurant.id,
        sender: 'user',
        text: userMsgContent,
        created_at: new Date().toISOString(),
      });

      const { data: freshRest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurant.id)
        .single();

      const currentRest = freshRest || restaurant;
      setRestaurant((prev: any) => (prev ? { ...prev, ...currentRest } : null));

      const apps = Array.isArray(currentRest.applications) ? currentRest.applications : [];
      const appUrl = (app: any) => (app?.value ?? app?.url ?? app?.link ?? '').toString().trim();
      const applicationsList = apps
        .filter((app: any) => app?.name && appUrl(app))
        .map((app: any) => ({ name: String(app.name), url: appUrl(app) }));

      const restaurantContextData = {
        name: currentRest.name ?? restaurant.name,
        menu: menuItems.map((i: any) => ({ name: i.name, price: i.sizes?.[0]?.price })),
        offers: offers.map((o: any) => ({ title: o.title, description: o.description })),
        applications: applicationsList,
        branches: branches.map(b => ({
          name: b.name,
          address: b.address,
          city: b.city,
          district: b.district,
          opening_hours: b.opening_hours,
          phone: b.phone,
          google_maps_url: b.google_maps_url,
        })),
        socialLinks: Array.isArray(currentRest.social_links)
          ? currentRest.social_links.filter((link: any) => link?.platform && link?.value).map((link: any) => ({ platform: link.platform, value: link.value }))
          : Array.isArray(currentRest.socialLinks)
          ? currentRest.socialLinks.filter((link: any) => link?.platform && link?.value).map((link: any) => ({ platform: link.platform, value: link.value }))
          : [],
      };

      const aiResponse = await restaurantChat({
        customerMessage: userMsgContent,
        restaurantData: JSON.stringify(restaurantContextData)
      });

      const botId = (Date.now() + 1).toString();
      const botMsg = {
        id: botId,
        sender: 'bot' as const,
        text: aiResponse.smartReply,
        timestamp: new Date(),
        session_id: sessionId,
        showApplications: aiResponse.showApplications === true,
        showBranches: aiResponse.showBranches === true,
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
      setStreamingMessageId(botId);
      setStreamingLength(0);
    } catch (error) {
      setMessages(prev => [...prev, { id: 'err', sender: 'bot', text: 'حدث خطأ فني...', timestamp: new Date() }]);
      setIsTyping(false);
    }
  };

  const primaryColor = restaurant?.primaryColor || '#e11d48';

  const toWhatsAppUrl = (phone: string | undefined): string => {
    if (!phone || !phone.trim()) return '#';
    const digits = phone.replace(/\D/g, '');
    if (!digits.length) return '#';
    const withCountry = digits.startsWith('966') ? digits : digits.startsWith('0') ? '966' + digits.slice(1) : digits.length === 9 && digits.startsWith('5') ? '966' + digits : '966' + digits;
    return `https://wa.me/${withCountry}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]" dir="rtl">
        <div className="h-24 w-full bg-gray-100 animate-pulse" />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-24 w-24 rounded-2xl mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 text-center p-6" dir="rtl">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
          <Info className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black text-right mt-4">المطعم غير موجود!</h1>
        <Button asChild className="w-full max-w-xs mt-6 h-12 rounded-2xl font-bold">
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  if (!restaurant.is_paid_plan) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fafafa] text-center p-6" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          <h1 className="text-xl font-black text-gray-900">المساعد الذكي متاح في الباقات المدفوعة</h1>
          <p className="text-sm text-muted-foreground">
            لتفعيل المساعد الذكي لعملائك، قم بترقية باقتك من لوحة التحكم في مرشح.
          </p>
          <Button asChild className="w-full h-12 rounded-2xl font-bold">
            <Link href={`/hub/${username}`}>العودة للرابط الرئيسي</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] pb-12 overflow-x-hidden" dir="rtl">
      <div className="bg-white border-b px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center text-center relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 rounded-2xl bg-muted/50 text-foreground hover:bg-muted"
          asChild
        >
          <Link href={`/hub/${username}`}>
            <ChevronRight className="h-6 w-6" />
          </Link>
        </Button>

        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shadow-lg overflow-hidden">
          <StorageImage
            imagePath={restaurant.logo}
            alt={restaurant.name}
            fill
            sizes="96px"
            className="object-cover"
          />
          <AvatarFallback className="rounded-2xl">{restaurant.name[0]}</AvatarFallback>
        </Avatar>
        <div className="space-y-1 mt-4">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">{restaurant.name}</h1>
          <p className="text-sm text-muted-foreground font-medium">المساعد الذكي</p>
        </div>
        <Link
          href={`/menu/${username}`}
          className="inline-flex items-center gap-2 mt-3 text-sm font-bold rounded-xl px-4 py-2 border border-gray-100 hover:bg-gray-50 transition-colors"
          style={{ color: primaryColor }}
        >
          <Utensils className="h-4 w-4" />
          قائمة الطعام
        </Link>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col min-h-0">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[50vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={cn("flex", msg.sender === 'user' ? "justify-end" : "justify-start")}
                >
                  <div className={cn("flex gap-2 max-w-[85%]", msg.sender === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className="h-8 w-8 shrink-0 mt-1 border overflow-hidden rounded-xl">
                      {msg.sender === 'bot' ? (
                        <div className="w-full h-full relative" style={{ backgroundColor: primaryColor }}>
                          <StorageImage imagePath={restaurant.logo} alt={restaurant.name} fill className="object-cover" sizes="32px" />
                        </div>
                      ) : (
                        <AvatarFallback className="bg-gray-200 rounded-xl">
                          <User className="h-4 w-4 text-gray-500" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col gap-2 min-w-0">
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed",
                          msg.sender === 'user'
                            ? 'text-white'
                            : 'bg-gray-50 text-gray-800 border border-gray-100',
                          msg.sender === 'user' ? "rounded-tr-none" : "rounded-tl-none"
                        )}
                        style={msg.sender === 'user' ? { backgroundColor: primaryColor } : {}}
                      >
                        {msg.sender === 'bot' && msg.id === streamingMessageId
                          ? (msg.text || '').slice(0, streamingLength)
                          : msg.text}
                        {msg.sender === 'bot' && msg.id === streamingMessageId && streamingLength < (msg.text || '').length && (
                          <span className="inline-block w-0.5 h-4 bg-current align-middle animate-pulse mr-0.5" aria-hidden />
                        )}
                      </div>
                      {msg.sender === 'bot' && (msg as any).showApplications && Array.isArray(restaurant.applications) && restaurant.applications.filter((a: any) => a?.name && (a?.value || a?.url)).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {restaurant.applications
                            .filter((a: any) => a?.name && (a?.value || a?.url))
                            .map((app: any, idx: number) => (
                              <a
                                key={app.id || idx}
                                href={(app.value || app.url || '').trim() || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-right"
                              >
                                <span className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                                  <StorageImage imagePath={app.logo} alt={app.name} fill className="object-contain" sizes="32px" />
                                </span>
                                <span className="text-sm font-bold text-gray-800">{app.name}</span>
                              </a>
                            ))}
                        </div>
                      )}
                      {msg.sender === 'bot' && (msg as any).showBranches && branches.length > 0 && (
                        <div className="space-y-3 mt-2">
                          {branches.map((branch: any) => (
                            <div key={branch.id || branch.name} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-right">
                              {branch.name && <p className="text-sm font-bold text-gray-800 mb-2">{branch.name}</p>}
                              <div className="flex flex-wrap gap-2">
                                {branch.phone && String(branch.phone).trim() && (
                                  <a
                                    href={toWhatsAppUrl(branch.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-sm transition-colors"
                                  >
                                    <MessageCircle className="h-4 w-4 shrink-0" />
                                    واتساب
                                  </a>
                                )}
                                {(branch.google_maps_url || branch.address) && (
                                  <a
                                    href={branch.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([branch.address, branch.city, branch.district].filter(Boolean).join('، '))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-sm transition-colors"
                                  >
                                    <MapPin className="h-4 w-4 shrink-0" />
                                    الانتقال للفرع
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="flex gap-2 items-center bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} className="h-1 shrink-0" aria-hidden />
          </div>

          <footer className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Input
                  placeholder="اسأل عن أي شيء ببالك..."
                  className="h-12 rounded-2xl border-gray-200 focus-visible:ring-offset-0 focus-visible:ring-2 pr-4 pl-12"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button
                  size="icon"
                  className="absolute top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl left-1.5"
                  style={{ backgroundColor: primaryColor }}
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                >
                  <SendHorizonal className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
