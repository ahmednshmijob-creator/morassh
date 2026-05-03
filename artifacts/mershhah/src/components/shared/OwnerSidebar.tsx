'use client';

import { usePathname, useRouter } from '@/lib/navigation';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuSkeleton,
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
  Store,
  ChevronDown,
  Box,
  icons,
  Star,
  Building2,
  BarChart3,
  GalleryHorizontal,
} from 'lucide-react';
import { Logo } from './Logo';
import { Separator } from '../ui/separator';
import { Link } from 'wouter';
import { LanguageSwitcherSimple } from './LanguageSwitcher';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';

const iconMap: { [key: string]: React.ElementType } = { ...icons, Box };

export function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [activatedTools, setActivatedTools] = useState<any[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(true);

  const menuItems = [
    { href: '/owner/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/owner/menu', label: 'إدارة المنيو', icon: Utensils },
    { href: '/owner/pricing', label: 'مركز التقارير', icon: BarChart3 },
    { href: '/owner/offers', label: 'إدارة العروض', icon: Megaphone },
    { href: '/owner/reviews', label: 'التقييمات', icon: Star },
    { href: '/owner/branches', label: 'إدارة الفروع', icon: Building2 },
    { href: '/owner/customize', label: 'تخصيص الواجهة', icon: Palette },
    { href: '/owner/studio', label: 'الاستوديو', icon: GalleryHorizontal },
    { href: '/owner/store', label: 'متجر الأدوات', icon: Store },
  ];

  const supportItems = [
    { href: '/owner/support', label: 'الدعم المباشر', icon: MessageSquare },
    { href: '/owner/tickets', label: 'تذاكر الدعم', icon: Ticket },
  ];

  useEffect(() => {
    const fetchTools = async () => {
      if (!user?.id) { setIsLoadingTools(false); return; }
      setIsLoadingTools(true);
      try {
        const { data: allTools } = await supabase.from('tools').select('id, title, icon');
        const allToolsMap = new Map((allTools || []).map((t: any) => [t.id, t]));
        const { data: activatedToolsData } = await supabase
          .from('activated_tools').select('tool_id').eq('profile_id', user.id);
        const userTools = (activatedToolsData || [])
          .map((row: any) => {
            const toolDetails = allToolsMap.get(row.tool_id) as any;
            if (!toolDetails) return null;
            const IconComponent = iconMap[toolDetails.icon as string] || Box;
            return { id: row.tool_id, label: toolDetails.title, href: `/owner/tools/${row.tool_id}`, icon: IconComponent };
          }).filter(Boolean);
        setActivatedTools(userTools as any[]);
      } catch (error) {
        console.error('Error fetching activated tools:', error);
      } finally {
        setIsLoadingTools(false);
      }
    };
    fetchTools();
  }, [user]);

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

          {(isLoadingTools || activatedTools.length > 0) && (
            <Collapsible open={isToolsOpen} onOpenChange={setIsToolsOpen} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton size="lg" className="h-11 px-3 text-base">
                    <Box className="h-5 w-5 shrink-0" />
                    <span>أدواتي المفعلة</span>
                    <ChevronDown className="mr-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {isLoadingTools ? (
                      <div className="p-2 space-y-1">
                        <SidebarMenuSkeleton showIcon />
                        <SidebarMenuSkeleton showIcon />
                      </div>
                    ) : (
                      activatedTools.map((tool) => (
                        <SidebarMenuSubItem key={tool.id}>
                          <SidebarMenuSubButton asChild isActive={pathname === tool.href} className="h-9 text-sm">
                            <Link href={tool.href}>
                              <tool.icon className="h-4 w-4 shrink-0" />
                              <span>{tool.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))
                    )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

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
      <SidebarFooter className="px-2 py-3">
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
        <div className="px-3 pt-2">
          <LanguageSwitcherSimple />
        </div>
      </SidebarFooter>
    </div>
  );
}
