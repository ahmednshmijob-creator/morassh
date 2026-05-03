'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { Header } from "@/components/shared/Header";
import React, { useEffect } from "react";
import { AdminAccountStatusChecker } from "@/components/auth/AdminAccountStatusChecker";
import { useUser } from "@/hooks/useUser";
import { useRouter } from '@/lib/navigation';
import { Loader2 } from "lucide-react";
import { SessionTimeout } from "@/components/shared/SessionTimeout";
import { useLanguage } from "@/components/shared/LanguageContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const { locale, dir } = useLanguage();
  const isRTL = locale === 'ar';

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
      <div dir={dir}>
        <SessionTimeout />
        <SidebarProvider
          defaultOpen={true}
          className={isRTL ? "flex-row-reverse" : ""}
          style={{ "--sidebar-width": "17rem" } as React.CSSProperties}
        >
          <Sidebar side={isRTL ? "right" : "left"} collapsible="none">
            <AdminSidebar />
          </Sidebar>
          <SidebarInset className="flex min-h-screen flex-col min-w-0 overflow-hidden">
            <Header />
            <main className="flex-1 w-full min-w-0 p-4 sm:p-6">
              <AdminAccountStatusChecker>
                {children}
              </AdminAccountStatusChecker>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
  );
}
