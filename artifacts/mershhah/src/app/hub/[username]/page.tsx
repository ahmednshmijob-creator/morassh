"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'wouter';
import { useRouter, useSearchParams } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
    Utensils,
    MapPin,
    Bot,
    Star,
    Share2,
    Info,
    Ticket
} from 'lucide-react';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import { getPublicPage } from '@/lib/public-pages';
import { StorageImage } from '@/components/shared/StorageImage';
import { InstagramIcon, TikTokIcon, SnapchatIcon, XIcon, WhatsAppIcon, WebsiteIcon, FacebookIcon, YoutubeIcon } from '@/components/shared/SocialIcons';
import { Skeleton } from '@/components/ui/skeleton';

const SOCIAL_ICONS: { [key: string]: React.ElementType } = {
    whatsapp: WhatsAppIcon,
    instagram: InstagramIcon,
    twitter: XIcon,
    tiktok: TikTokIcon,
    snapchat: SnapchatIcon,
    facebook: FacebookIcon,
    youtube: YoutubeIcon,
    website: WebsiteIcon,
};

const SOCIAL_COLORS: { [key: string]: string } = {
    whatsapp: '#25D366',
    instagram: '#E4405F',
    tiktok: '#000000',
    twitter: '#000000',
    snapchat: '#FFFC00',
    facebook: '#1877F2',
    youtube: '#FF0000',
    website: '#714dfa',
};

export default function RestaurantHubPage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const recordedViewOfferIds = useRef<Set<string>>(new Set());
  const searchParams = useSearchParams();
  const hubVisitRecorded = useRef(false);

  useEffect(() => {
    if (!restaurant?.id || hubVisitRecorded.current) return;
    hubVisitRecorded.current = true;
    const source = searchParams.get('source') === 'qr_branch' ? 'qr_branch' : 'link';
    supabase.from('hub_visits').insert({
      restaurant_id: restaurant.id,
      source,
      created_at: new Date().toISOString(),
    }).then(() => {});
  }, [restaurant?.id, searchParams]);

  useEffect(() => {
    if (!restaurant?.id || !offers.length) return;
    const restId = restaurant.id;
    offers.forEach(async (offer) => {
      if (recordedViewOfferIds.current.has(offer.id)) return;
      recordedViewOfferIds.current.add(offer.id);
      const { data: current } = await supabase
        .from('offers')
        .select('views_count')
        .eq('id', offer.id)
        .single();
      const newCount = (current?.views_count || 0) + 1;
      supabase.from('offers').update({ views_count: newCount }).eq('id', offer.id).then(() => {});
    });
  }, [restaurant?.id, offers]);

  useEffect(() => {
    if (!username) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const data = await getPublicPage(username);
        if (data) {
          setRestaurant(data.restaurant);
          setOffers(data.offers ?? []);
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

        const now = new Date().toISOString();
        const { data: offersData } = await supabase
          .from('offers')
          .select('*')
          .eq('restaurant_id', rest.id)
          .eq('status', 'active')
          .gt('valid_until', now);

        setOffers(offersData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`hub-${username}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [username]);

  const handleOfferClick = async (offer: { id: string; external_link?: string | null }) => {
    if (!restaurant?.id) return;
    const { data: current } = await supabase
      .from('offers')
      .select('clicks_count, link_clicks_count')
      .eq('id', offer.id)
      .single();
    const updates: any = { clicks_count: (current?.clicks_count || 0) + 1 };
    if (offer.external_link) updates.link_clicks_count = (current?.link_clicks_count || 0) + 1;
    supabase.from('offers').update(updates).eq('id', offer.id).then(() => {});
    const url = offer.external_link || '#';
    if (url.startsWith('http')) window.location.href = url;
    else if (url !== '#') router.push(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurant?.name,
          text: restaurant?.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center p-8 gap-6" dir="rtl">
      <Skeleton className="h-48 rounded-3xl w-full max-w-md" />
      <Skeleton className="h-14 rounded-2xl w-full max-w-md" />
      <Skeleton className="h-14 rounded-2xl w-full max-w-md" />
      <Skeleton className="h-14 rounded-2xl w-full max-w-md" />
    </div>
  );

  if (!restaurant) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 text-center p-4" dir="rtl">
      <div className="space-y-6 max-w-md bg-white p-12 rounded-3xl shadow-xl w-full">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500"><Info className="h-10 w-10" /></div>
        <h1 className="text-2xl font-black text-right">المطعم غير موجود!</h1>
        <Button asChild className="w-full h-12 rounded-2xl font-bold"><Link href="/">العودة للرئيسية</Link></Button>
      </div>
    </div>
  );

  const primaryColor = restaurant.primaryColor || '#714dfa';
  const socialLinks = restaurant.social_links || restaurant.socialLinks || [];

  return (
    <div className="min-h-screen w-full bg-[#fafafa] flex flex-col overflow-x-hidden selection:bg-primary selection:text-white" dir="rtl">
      <div className="bg-white border-b px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center text-center">
        <div className="w-full max-w-4xl mx-auto relative">
          <div className="absolute top-0 left-0">
            <Button onClick={handleShare} size="icon" variant="ghost" className="rounded-full bg-muted/50 hover:bg-muted text-muted-foreground">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white p-1 shadow-lg rounded-2xl overflow-hidden mx-auto mb-4 border border-gray-100">
            <div className="w-full h-full relative overflow-hidden rounded-[0.9rem] sm:rounded-[1.8rem]">
              <StorageImage imagePath={restaurant.logo} alt={restaurant.name} fill className="object-contain" sizes="96px" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">{restaurant.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-lg mx-auto line-clamp-2">
              {restaurant.description || "أهلاً بك في عالمنا الخاص."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-12">

        {offers.length > 0 && (
          <section className="space-y-3">
            <div className="flex overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory w-full">
              {offers.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => handleOfferClick(offer)}
                  className="shrink-0 flex-[0_0_100%] w-full max-w-full snap-center snap-always text-right"
                >
                  <div className="relative aspect-[4/3] bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col group">
                    <div className="relative flex-1 bg-gray-50/50 min-h-0">
                      <StorageImage
                        imagePath={offer.image_url}
                        alt={offer.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="400px"
                      />
                    </div>
                    <div className="p-3 bg-white border-t border-gray-50">
                      <h4 className="text-sm font-black text-center truncate text-gray-900">{offer.title}</h4>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          {restaurant.is_paid_plan && (
            <Link href={`/ai/${username}`} className="block">
              <div className="flex items-center gap-4 p-4 rounded-2xl text-white shadow-md transition-all h-[64px]" style={{ backgroundColor: primaryColor }}>
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30">
                  <Bot className="h-6 w-6" />
                </div>
                <div className="flex-1 text-right">
                  <span className="font-black text-lg block">المساعد الذكي</span>
                </div>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link href={`/menu/${username}`} className="block">
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all h-[64px]">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl text-white shrink-0" style={{ backgroundColor: primaryColor }}>
                  <Utensils className="h-6 w-6" />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <span className="font-black text-sm text-gray-900 block truncate">المنيو</span>
                </div>
              </div>
            </Link>

            <Link href={`/reviews/${username}`} className="block">
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all h-[64px]">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
                  <Star className="h-6 w-6 fill-current" />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <span className="font-black text-sm text-gray-900 block truncate">التقييمات</span>
                </div>
              </div>
            </Link>

            <Link href={`/branches/${username}`} className="block">
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all h-[64px]">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <span className="font-black text-sm text-gray-900 block truncate">الفروع</span>
                </div>
              </div>
            </Link>

            <Link href={`/support/${username}`} className="block">
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all h-[64px]">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-100 text-purple-600 shrink-0">
                  <Ticket className="h-6 w-6" />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <span className="font-black text-sm text-gray-900 block truncate">تذكرة دعم</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {restaurant.applications && restaurant.applications.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-black text-sm text-gray-500 px-1 text-right">التطبيقات</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {restaurant.applications.map((app: any, idx: number) => (
                <Link key={app.id || idx} href={app.value || '#'} target="_blank" className="aspect-square bg-white border rounded-2xl p-3 flex items-center justify-center hover:shadow-md transition-all">
                  <div className="relative w-full h-full">
                    <StorageImage imagePath={app.logo} alt={app.name} fill className="object-contain" sizes="64px" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(socialLinks) && socialLinks.filter((link: any) => link?.value?.trim()).length > 0 && (
          <section className="space-y-4 text-right">
            <h3 className="font-black text-sm text-gray-500 px-1">تواصل معنا</h3>
            <div className="flex flex-wrap justify-center gap-4 pb-10">
              {socialLinks
                .filter((link: any) => link?.platform && link?.value?.trim())
                .map((link: any, idx: number) => {
                  const Icon = SOCIAL_ICONS[link.platform] || WebsiteIcon;
                  return (
                    <Link key={link.id || idx} href={link.value.trim()} target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border shadow-sm hover:shadow-md transition-all">
                      <Icon size={24} style={{ color: SOCIAL_COLORS[link.platform] || primaryColor }} />
                    </Link>
                  );
                })}
            </div>
          </section>
        )}

        {!restaurant.is_paid_plan && (
          <div className="pt-8 border-t border-gray-200 text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">مدعوم بواسطة مرشح</p>
          </div>
        )}
      </div>
    </div>
  );
}
