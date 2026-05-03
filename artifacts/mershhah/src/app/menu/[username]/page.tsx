"use client";
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'wouter';
import { useRouter } from '@/lib/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronRight, Search, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { getPublicPage } from '@/lib/public-pages';
import { StorageImage } from '@/components/shared/StorageImage';
import type { MenuItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export default function PublicMenuPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);

  const applySort = (items: MenuItem[]): MenuItem[] => {
    const hasPositions = items.some(item => item.position != null);
    if (hasPositions) return [...items].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    type E = MenuItem & { profitMargin: number; popularity: number; classification: 'Star' | 'Plow-Horse' | 'Puzzle' | 'Dog' };
    const engineered: E[] = items.map((item) => {
      const size = Array.isArray(item.sizes) && item.sizes[0] ? item.sizes[0] : { price: 0, cost: 0 };
      const price = typeof size.price === 'number' ? size.price : 0;
      const cost = typeof size.cost === 'number' ? size.cost : 0;
      const profitMargin = price > 0 ? ((price - cost) / price) * 100 : 0;
      const popularity = item.clicks_count ?? 0;
      return { ...item, profitMargin, popularity, classification: 'Dog' as const };
    });
    const margins = engineered.map(i => i.profitMargin).sort((a, b) => a - b);
    const popularities = engineered.map(i => i.popularity).sort((a, b) => a - b);
    const medianMargin = margins[Math.floor(margins.length / 2)] ?? 0;
    const medianPopularity = popularities[Math.floor(popularities.length / 2)] ?? 0;
    const classificationOrder: Record<string, number> = { Star: 1, Puzzle: 2, 'Plow-Horse': 3, Dog: 4 };
    engineered.forEach((item) => {
      const highProfit = item.profitMargin >= medianMargin;
      const highPopularity = item.popularity >= medianPopularity;
      item.classification = (highProfit && highPopularity) ? 'Star' : (highProfit && !highPopularity) ? 'Puzzle' : (!highProfit && highPopularity) ? 'Plow-Horse' : 'Dog';
    });
    return engineered.sort((a, b) => {
      const o = classificationOrder[a.classification] - classificationOrder[b.classification];
      if (o !== 0) return o;
      return (b.popularity ?? 0) - (a.popularity ?? 0);
    }) as MenuItem[];
  };

  useEffect(() => {
    if (!username) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const data = await getPublicPage(username);
        if (data?.restaurant && Array.isArray(data.menu)) {
          setRestaurant(data.restaurant);
          const items = data.menu as MenuItem[];
          setMenuItems(applySort(items));
          setCategories(['الكل', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))]);
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

        const { data: items } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', rest.id);

        const sorted = applySort((items || []) as MenuItem[]);
        setMenuItems(sorted);
        setCategories(['الكل', ...Array.from(new Set(sorted.map(i => i.category).filter(Boolean)))]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`menu-${username}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [username]);

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'الكل' || item.category === activeCategory;
      const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const primaryColor = restaurant?.primaryColor || '#e11d48';

  const getPriceDisplay = (item: any) => {
    const price = item.sizes?.[0]?.price;
    if (price === 0) return 'مجاني';
    if (price === undefined || price === null) return 'حسب الطلب';
    return `${price} ر.س`;
  };

  const recordItemClick = async (item: MenuItem) => {
    if (!restaurant?.id) return;
    const current = await supabase
      .from('menu_items')
      .select('clicks_count')
      .eq('id', item.id)
      .single();
    const newCount = (current.data?.clicks_count || 0) + 1;
    supabase.from('menu_items').update({ clicks_count: newCount }).eq('id', item.id).then(() => {});
    supabase.from('menu_item_interactions').insert({
      menu_item_id: item.id,
      restaurant_id: restaurant.id,
      created_at: new Date().toISOString(),
    }).then(() => {});
  };

  const getSuggestionsForItem = (item: MenuItem, allItems: MenuItem[]) => {
    const candidates = allItems.filter(i => i.id !== item.id && i.status === 'available');
    if (candidates.length === 0) return [];
    const sidePriority = ['appetizer', 'dessert', 'drink', 'offer'];
    const scored = candidates.map((c) => {
      let score = 0;
      if (c.display_tags === 'best_seller') score += 3;
      if (c.display_tags === 'daily_offer') score += 2;
      if (sidePriority.includes(c.category)) score += 2;
      if (item.category === 'main' && sidePriority.includes(c.category)) score += 2;
      if (c.category === 'offer') score += 2;
      const clicks = c.clicks_count ?? 0;
      score += Math.min(clicks, 10) * 0.3;
      const baseSize = Array.isArray(c.sizes) && c.sizes[0] ? c.sizes[0] : { price: 0, cost: 0 };
      const price = typeof baseSize.price === 'number' ? baseSize.price : 0;
      const cost = typeof baseSize.cost === 'number' ? baseSize.cost : 0;
      const margin = price > 0 ? (price - cost) / price : 0;
      score += margin * 2;
      return { item: c, score, price };
    });
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.price - b.price;
    });
    return scored.slice(0, 3).map(s => s.item);
  };

  if (loading) return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="h-24 w-full bg-gray-100 animate-pulse" />
      <div className="max-w-4xl mx-auto px-6 space-y-8 mt-8">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}
        </div>
        {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full rounded-3xl" />)}
      </div>
    </div>
  );

  if (!restaurant) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-center p-6 space-y-6">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
        <Info size={40} />
      </div>
      <h1 className="text-xl font-black text-gray-900">المطعم غير موجود!</h1>
      <Button onClick={() => router.push('/')} variant="outline" className="rounded-full px-8">العودة للرئيسية</Button>
    </div>
  );

  const activeSuggestions = activeItem ? getSuggestionsForItem(activeItem, menuItems) : [];

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] pb-12 overflow-x-hidden" dir="rtl">
      <div className="bg-white border-b px-6 py-8 flex flex-col items-center text-center space-y-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 rounded-2xl bg-muted/50 text-foreground hover:bg-muted"
          onClick={() => router.back()}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Avatar className="h-24 w-24 rounded-[2rem] shadow-xl overflow-hidden">
            <StorageImage
              imagePath={restaurant.logo}
              alt={restaurant.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          </Avatar>
        </motion.div>
        <div className="space-y-1 mt-5">
          <motion.h1 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">{restaurant.name}</motion.h1>
          <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-muted-foreground text-sm font-medium max-w-lg mx-auto line-clamp-2">{restaurant.description || "أهلاً بك في قائمتنا"}</motion.p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 md:px-0 mt-4 relative z-10">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/80 p-4 md:p-5 space-y-5">
          <div className="relative group">
            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              placeholder="ابحث عن طبقك المفضل..."
              className="rounded-2xl bg-gray-50 border-none focus:ring-4 focus:ring-primary/5 h-14 text-base font-bold transition-all pr-14 pl-6"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-xl shrink-0 px-6 h-11 font-black transition-all border-2",
                  activeCategory === cat
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-gray-50 text-gray-400 border-transparent hover:border-gray-200"
                )}
                style={activeCategory === cat ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-10 space-y-12">
          {categories.filter(c => c !== 'الكل').map(category => {
            const itemsInCategory = filteredItems.filter(item => item.category === category);
            if (itemsInCategory.length === 0) return null;

            const maxClicksInCategory = Math.max(0, ...itemsInCategory.map(i => i.clicks_count ?? 0));
            const mostOrderedInCategory = maxClicksInCategory > 0
              ? itemsInCategory.find(i => (i.clicks_count ?? 0) === maxClicksInCategory)
              : null;

            return (
              <section key={category} className="space-y-6 text-right">
                <div className="flex items-center gap-4 px-2">
                  <h2 className="text-2xl font-black text-gray-900">{category}</h2>
                  <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-gray-200" />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {itemsInCategory.map((item, index) => {
                    const isMostOrdered = mostOrderedInCategory?.id === item.id;
                    return (
                      <div key={item.id} className="space-y-4">
                        <motion.div
                          role="button"
                          tabIndex={0}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => { recordItemClick(item); setActiveItem(item); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { recordItemClick(item); setActiveItem(item); } }}
                          className="group bg-white rounded-[2rem] overflow-hidden flex flex-col sm:flex-row shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer"
                        >
                          <div className="relative w-full sm:w-48 h-48 sm:h-auto shrink-0 overflow-hidden">
                            <StorageImage imagePath={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" sizes="300px" />
                            {isMostOrdered && (
                              <div className="absolute top-3 right-3">
                                <Badge
                                  className="text-white border-0 font-bold px-3 py-1 rounded-lg"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  الأكثر طلباً
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 p-6 flex flex-col justify-between space-y-4 text-right">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <h3 className="text-xl font-black text-gray-900">{item.name}</h3>
                                <span className="text-xl font-black" style={{ color: primaryColor }}>{getPriceDisplay(item)}</span>
                              </div>
                              <p className="text-gray-500 font-medium leading-relaxed line-clamp-3 text-sm md:text-base">{item.description}</p>
                              {Array.isArray(item.sizes) && item.sizes.length > 0 && (
                                <p className="text-[11px] text-gray-500 font-semibold">
                                  الأحجام المتوفرة:&nbsp;
                                  {item.sizes.map((size, idx) => (
                                    <span key={size.id || size.name}>
                                      {size.name}{idx < item.sizes.length - 1 ? " • " : ""}
                                    </span>
                                  ))}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-32 space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
                <Search size={40} />
              </div>
              <p className="text-lg font-black text-gray-400">لا توجد نتائج لهذا البحث</p>
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!activeItem} onOpenChange={(open) => !open && setActiveItem(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-3xl px-0 pb-4 pt-2">
          {activeItem && (
            <div className="max-w-md mx-auto px-4 space-y-4">
              <SheetHeader className="text-right">
                <SheetTitle className="text-lg font-black">{activeItem.name}</SheetTitle>
              </SheetHeader>

              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100">
                <StorageImage
                  imagePath={activeItem.image_url}
                  alt={activeItem.name}
                  fill
                  className="object-cover"
                  sizes="400px"
                />
                <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
                  يبدأ من {getPriceDisplay(activeItem)}
                </div>
              </div>

              <SheetDescription className="text-sm text-muted-foreground text-right leading-relaxed">
                {activeItem.description}
              </SheetDescription>

              {Array.isArray(activeItem.sizes) && activeItem.sizes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-600 text-right">اختر الحجم المناسب لك</p>
                  <div className="grid grid-cols-2 gap-2">
                    {activeItem.sizes.map((size) => (
                      <div
                        key={size.id || size.name}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-3 flex flex-col items-end gap-1 text-right"
                        dir="rtl"
                      >
                        <span className="text-sm font-bold text-gray-900">{size.name}</span>
                        {typeof size.price === 'number' && (
                          <span className="text-xs font-black" style={{ color: primaryColor }}>
                            {size.price} ر.س
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-600 text-right">عادة يطلبون معه</p>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    {activeSuggestions.map((sug) => (
                      <div
                        key={sug.id}
                        className="shrink-0 w-28 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm"
                      >
                        <div className="relative aspect-square">
                          <StorageImage
                            imagePath={sug.image_url}
                            alt={sug.name}
                            fill
                            className="object-cover"
                            sizes="112px"
                          />
                        </div>
                        <div className="p-2 text-center">
                          <p className="text-xs font-bold text-gray-900 truncate">{sug.name}</p>
                          <p className="text-[10px] font-black" style={{ color: primaryColor }}>
                            {getPriceDisplay(sug)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
