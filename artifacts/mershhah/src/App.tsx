import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { LanguageProvider } from "@/components/shared/LanguageContext";
import { HydrationGate } from "@/components/shared/HydrationGate";
import { UserProvider } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";

const HomePage = lazy(() => import("@/app/page"));
const LoginPage = lazy(() => import("@/app/login/page"));
const RegisterPage = lazy(() => import("@/app/register/page"));
const RegisterAffiliatePage = lazy(() => import("@/app/register-affiliate/page"));
const ForgotPasswordPage = lazy(() => import("@/app/forgot-password/page"));
const PricingPage = lazy(() => import("@/app/pricing/page"));
const NotFoundPage = lazy(() => import("@/app/not-found"));

const OwnerLayout = lazy(() => import("@/app/owner/layout"));
const OwnerDashboardPage = lazy(() => import("@/app/owner/dashboard/page"));
const OwnerMenuPage = lazy(() => import("@/app/owner/menu/page"));
const OwnerOffersPage = lazy(() => import("@/app/owner/offers/page"));
const OwnerCustomizePage = lazy(() => import("@/app/owner/customize/page"));
const OwnerBranchesPage = lazy(() => import("@/app/owner/branches/page"));
const OwnerReviewsPage = lazy(() => import("@/app/owner/reviews/page"));
const OwnerSettingsPage = lazy(() => import("@/app/owner/settings/page"));
const OwnerPricingPage = lazy(() => import("@/app/owner/pricing/page"));
const OwnerTicketsPage = lazy(() => import("@/app/owner/tickets/page"));
const OwnerTicketDetailPage = lazy(() => import("@/app/owner/tickets/[ticketId]/page"));
const DailyPulsePage = lazy(() => import("@/app/owner/tools/daily-pulse-dashboard/page"));
const MarketingCalendarPage = lazy(() => import("@/app/owner/tools/marketing-calendar/page"));
const ReplyTemplatesPage = lazy(() => import("@/app/owner/tools/reply-templates/page"));
const SummarizeFeedbackPage = lazy(() => import("@/app/owner/tools/summarize-feedback/page"));
const WeeklyContentWriterPage = lazy(() => import("@/app/owner/tools/weekly-content-writer/page"));
const OwnerSupportPage = lazy(() => import("@/app/owner/support/page"));
const OwnerStudioPage = lazy(() => import("@/app/owner/studio/page"));
const OwnerUpgradePage = lazy(() => import("@/app/owner/upgrade/page"));
const OwnerIndexPage = lazy(() => import("@/app/owner/page"));

const AdminLayout = lazy(() => import("@/app/admin/layout"));
const AdminDashboardPage = lazy(() => import("@/app/admin/dashboard/page"));
const AdminManagementPage = lazy(() => import("@/app/admin/management/page"));
const AdminPlansPage = lazy(() => import("@/app/admin/plans/page"));
const AdminSupportPage = lazy(() => import("@/app/admin/support/page"));
const AdminSupportChatPage = lazy(() => import("@/app/admin/support/[chatId]/page"));
const AdminSettingsPage = lazy(() => import("@/app/admin/settings/page"));
const AdminTeamPage = lazy(() => import("@/app/admin/team/page"));
const AdminSalesPage = lazy(() => import("@/app/admin/sales/page"));
const AdminApplicationsPage = lazy(() => import("@/app/admin/applications/page"));
const AdminAnnouncementsPage = lazy(() => import("@/app/admin/announcements/page"));
const AdminWorkflowPage = lazy(() => import("@/app/admin/workflow/page"));
const AdminFinancePage = lazy(() => import("@/app/admin/finance/page"));

const ReferLookupPage = lazy(() => import("@/app/refer/lookup/page"));
const TicketLookupPage = lazy(() => import("@/app/ticket/lookup/page"));
const ReferPage = lazy(() => import("@/app/refer/page"));

const MenuPage = lazy(() => import("@/app/menu/[username]/page"));
const HubPage = lazy(() => import("@/app/hub/[username]/page"));
const AiPage = lazy(() => import("@/app/ai/[username]/page"));
const BranchesPublicPage = lazy(() => import("@/app/branches/[username]/page"));
const ChatPage = lazy(() => import("@/app/chat/[username]/page"));
const ReviewsPublicPage = lazy(() => import("@/app/reviews/[username]/page"));
const BlogListPage = lazy(() => import("@/app/blog/page"));
const BlogPostPage = lazy(() => import("@/app/blog/[slug]/page"));
const AboutPage = lazy(() => import("@/app/about/page"));
const ContactPage = lazy(() => import("@/app/contact/page"));
const PrivacyPage = lazy(() => import("@/app/privacy/page"));
const TermsPage = lazy(() => import("@/app/terms/page"));
const BioPage = lazy(() => import("@/app/bio/page"));
const SuccessPage = lazy(() => import("@/app/success/page"));
const FailurePage = lazy(() => import("@/app/failure/page"));
const StatusPage = lazy(() => import("@/app/status/page"));
const TicketPage = lazy(() => import("@/app/ticket/page"));
const SupportPublicPage = lazy(() => import("@/app/support/[username]/page"));
const OAuthConsentPage = lazy(() => import("@/app/oauth/consent/page"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex flex-col gap-4 p-8">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-64 w-full mt-4" />
    </div>
  );
}

function OwnerRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <OwnerLayout>
        <Switch>
          <Route path="/owner/dashboard" component={OwnerDashboardPage} />
          <Route path="/owner/menu" component={OwnerMenuPage} />
          <Route path="/owner/offers" component={OwnerOffersPage} />
          <Route path="/owner/customize" component={OwnerCustomizePage} />
          <Route path="/owner/branches" component={OwnerBranchesPage} />
          <Route path="/owner/reviews" component={OwnerReviewsPage} />
          <Route path="/owner/settings" component={OwnerSettingsPage} />
          <Route path="/owner/pricing" component={OwnerPricingPage} />
          <Route path="/owner/tickets/:ticketId" component={OwnerTicketDetailPage} />
          <Route path="/owner/tickets" component={OwnerTicketsPage} />
          <Route path="/owner/tools/daily-pulse-dashboard" component={DailyPulsePage} />
          <Route path="/owner/tools/marketing-calendar" component={MarketingCalendarPage} />
          <Route path="/owner/tools/reply-templates" component={ReplyTemplatesPage} />
          <Route path="/owner/tools/summarize-feedback" component={SummarizeFeedbackPage} />
          <Route path="/owner/tools/weekly-content-writer" component={WeeklyContentWriterPage} />
          <Route path="/owner/support" component={OwnerSupportPage} />
          <Route path="/owner/studio" component={OwnerStudioPage} />
          <Route path="/owner/upgrade" component={OwnerUpgradePage} />
          <Route component={NotFoundPage} />
        </Switch>
      </OwnerLayout>
    </Suspense>
  );
}

function AdminRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminLayout>
        <Switch>
          <Route path="/admin/dashboard" component={AdminDashboardPage} />
          <Route path="/admin/management" component={AdminManagementPage} />
          <Route path="/admin/plans" component={AdminPlansPage} />
          <Route path="/admin/support/:chatId" component={AdminSupportChatPage} />
          <Route path="/admin/support" component={AdminSupportPage} />
          <Route path="/admin/settings" component={AdminSettingsPage} />
          <Route path="/admin/team" component={AdminTeamPage} />
          <Route path="/admin/sales" component={AdminSalesPage} />
          <Route path="/admin/applications" component={AdminApplicationsPage} />
          <Route path="/admin/announcements" component={AdminAnnouncementsPage} />
          <Route path="/admin/workflow" component={AdminWorkflowPage} />
          <Route path="/admin/finance" component={AdminFinancePage} />
          <Route component={NotFoundPage} />
        </Switch>
      </AdminLayout>
    </Suspense>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/register-affiliate" component={RegisterAffiliatePage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/bio" component={BioPage} />
        <Route path="/success" component={SuccessPage} />
        <Route path="/failure" component={FailurePage} />
        <Route path="/refer/lookup" component={ReferLookupPage} />
        <Route path="/refer" component={ReferPage} />
        <Route path="/status" component={StatusPage} />
        <Route path="/ticket/lookup" component={TicketLookupPage} />
        <Route path="/ticket" component={TicketPage} />
        <Route path="/owner" component={OwnerIndexPage} />
        <Route path="/support/:username" component={SupportPublicPage} />
        <Route path="/oauth/consent" component={OAuthConsentPage} />
        <Route path="/blog" component={BlogListPage} />
        <Route path="/blog/:slug" component={BlogPostPage} />
        <Route path="/menu/:username" component={MenuPage} />
        <Route path="/hub/:username" component={HubPage} />
        <Route path="/ai/:username" component={AiPage} />
        <Route path="/branches/:username" component={BranchesPublicPage} />
        <Route path="/chat/:username" component={ChatPage} />
        <Route path="/reviews/:username" component={ReviewsPublicPage} />
        <Route path="/owner/:rest*" component={OwnerRoutes} />
        <Route path="/admin/:rest*" component={AdminRoutes} />
        <Route component={NotFoundPage} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <LanguageProvider>
            <UserProvider>
              <HydrationGate>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <Toaster />
              </HydrationGate>
            </UserProvider>
          </LanguageProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
