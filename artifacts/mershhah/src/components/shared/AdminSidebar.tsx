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
  LogOut,
  Settings,
  MessageSquare,
  Building,
  Store,
  Users,
  Activity,
  Megaphone,
  AppWindow,
  Package,
  TrendingUp,
} from 'lucide-react';
import { Logo } from './Logo';
import { Separator } from '../ui/separator';
import { Link } from 'wouter';
import { LanguageSwitcherSimple } from './LanguageSwitcher';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';

const SUPER_ADMIN_EMAIL = 'ahmedsupsa@gmail.com';

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const menuItems = [
    { href: '/admin/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, permissionId: 'dashboard' },
    { href: '/admin/management', label: 'المشتركين', icon: Building, permissionId: 'management' },
    { href: '/admin/plans', label: 'الباقات', icon: Package, permissionId: 'financials' },
    { href: '/admin/store-management', label: 'إدارة المتجر', icon: Store, permissionId: 'store-management' },
    { href: '/admin/applications', label: 'التطبيقات', icon: AppWindow, permissionId: 'applications' },
    { href: '/admin/announcements', label: 'الإعلانات', icon: Megaphone, permissionId: 'announcements' },
    { href: '/admin/support', label: 'الدعم المباشر', icon: MessageSquare, permissionId: 'support' },
    { href: '/admin/team', label: 'الفريق', icon: Users, permissionId: 'team' },
    { href: '/admin/workflow', label: 'سير العمل', icon: Activity, permissionId: 'workflow' },
    { href: '/admin/sales', label: 'دليل المبيعات', icon: TrendingUp, permissionId: 'sales' },
  ];

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('adminHasUnread', true);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('admin-unread-chats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => { fetchUnread(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const visibleMenuItems = menuItems.filter((item) => {
    if (user?.email === SUPER_ADMIN_EMAIL) return true;
    return user?.admin_permissions?.includes(item.permissionId);
  });

  return (
    <aside className="flex h-full flex-col">
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent className="flex-1">
        <SidebarMenu>
          {visibleMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                <Link href={item.href} className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                  {item.href === '/admin/support' && unreadCount > 0 && (
                    <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/admin/settings">
                <Settings className="h-4 w-4" />
                الإعدادات
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator className="my-2" />
        <SidebarMenuButton
          onClick={handleLogout}
          className="text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </SidebarMenuButton>
        <div className="px-2 py-1 mt-2">
          <LanguageSwitcherSimple />
        </div>
      </SidebarFooter>
    </aside>
  );
}
