'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { OwnerSidebar } from "@/components/shared/OwnerSidebar";
import { Header } from "@/components/shared/Header";
import React, { useEffect } from "react";
import { AccountStatusChecker } from "@/components/auth/AccountStatusChecker";
import { useUser } from "@/hooks/useUser";
import { useRouter } from '@/lib/navigation';
import { Loader2 } from "lucide-react";
import { DashboardAssistant } from "@/components/dashboard/DashboardAssistant";
import { SessionTimeout } from "@/components/shared/SessionTimeout";
import { useLanguage } from "@/components/shared/LanguageContext";

export default function OwnerLayout({
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
        <SidebarProvider>
          <Sidebar side={isRTL ? "right" : "left"}>
            <OwnerSidebar />
          </Sidebar>
          <div className="min-h-screen w-full bg-muted/40">
              <SidebarInset>
                  <Header />
                  <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:grid-cols-1">
                      <AccountStatusChecker>
                        {children}
                      </AccountStatusChecker>
                  </main>
                  <DashboardAssistant />
              </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
  );
}
