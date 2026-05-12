'use client';

import { usePathname, useRouter } from '@/lib/navigation';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Utensils,
  Megaphone,
  Palette,
  LogOut,
  Settings,
  MessageSquare,
  Ticket,
  Star,
  Building2,
  BarChart3,
  GalleryHorizontal,
  Zap,
} from 'lucide-react';
import { Logo } from './Logo';
import { Separator } from '../ui/separator';
import { Link } from 'wouter';
import { LanguageSwitcherSimple } from './LanguageSwitcher';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { useUser as useUserCtx } from '@/contexts/UserContext';

export function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { user: ctxUser } = useUserCtx();

  const menuItems = [
    { href: '/owner/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/owner/menu', label: 'إدارة المنيو', icon: Utensils },
    { href: '/owner/pricing', label: 'مركز التقارير', icon: BarChart3 },
    { href: '/owner/offers', label: 'إدارة العروض', icon: Megaphone },
    { href: '/owner/reviews', label: 'التقييمات', icon: Star },
    { href: '/owner/branches', label: 'إدارة الفروع', icon: Building2 },
    { href: '/owner/customize', label: 'تخصيص الواجهة', icon: Palette },
    { href: '/owner/studio', label: 'الاستوديو', icon: GalleryHorizontal },
  ];

  const supportItems = [
    { href: '/owner/support', label: 'الدعم المباشر', icon: MessageSquare },
    { href: '/owner/tickets', label: 'تذاكر الدعم', icon: Ticket },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col bg-sidebar border-l">
      <SidebarHeader className="px-4 py-4">
        <Logo />
      </SidebarHeader>
      <Separator />
      <SidebarContent className="flex-1 px-2 py-3">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                size="lg"
                isActive={pathname.startsWith(item.href)}
                className="h-11 px-3 text-base"
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          <Separator className="my-2" />

          {supportItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                size="lg"
                isActive={pathname.startsWith(item.href)}
                className="h-11 px-3 text-base"
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter className="px-2 py-3 space-y-2">
        {/* Upgrade card — only show for free plan */}
        {ctxUser && (ctxUser.entitlements?.planId === 'free' || ctxUser.entitlements?.planId === 'none') && (
          <Link href="/owner/upgrade">
            <div className={`mx-1 mb-1 rounded-xl p-3 cursor-pointer transition-all border ${pathname.startsWith('/owner/upgrade') ? 'bg-primary/15 border-primary/40' : 'bg-primary/5 border-primary/20 hover:bg-primary/10'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-primary">ترقية الباقة</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                أطلق كامل إمكانيات المنصة — الذكاء الاصطناعي، التحليلات، والمزيد.
              </p>
            </div>
          </Link>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              isActive={pathname === '/owner/settings'}
              className="h-11 px-3 text-base"
            >
              <Link href="/owner/settings">
                <Settings className="h-5 w-5 shrink-0" />
                <span>الإعدادات</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={handleLogout}
              className="h-11 px-3 text-base text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-3 pt-1">
          <LanguageSwitcherSimple />
        </div>
      </SidebarFooter>
    </div>
  );
}
