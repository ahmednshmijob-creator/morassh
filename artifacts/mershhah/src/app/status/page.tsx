
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, Bot, LayoutDashboard, Bell } from "lucide-react";
import { Link } from "wouter";

const services = [
  {
    name: "المساعد الذكي وواجهة المحادثة",
    icon: Bot,
    status: "شغالة",
  },
  {
    name: "لوحات التحكم (للأدمن وأصحاب المطاعم)",
    icon: LayoutDashboard,
    status: "شغالة",
  },
  {
    name: "نظام الإشعارات والتنبيهات",
    icon: Bell,
    status: "شغالة",
  },
];

export default function StatusPage() {
  const allSystemsOperational = services.every(s => s.status === "شغالة");

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="container mx-auto px-4">
        <header className="py-6 flex justify-between items-center border-b">
          <Logo />
          <Button asChild variant="outline">
            <Link href="/">
                <ArrowLeft className="ml-2 h-4 w-4" />
                ارجع للرئيسية
            </Link>
          </Button>
        </header>

        <main className="py-16 md:py-24 flex flex-col items-center text-center">
            <Card className="w-full max-w-3xl">
                <CardHeader>
                    {allSystemsOperational ? (
                        <div className="flex flex-col items-center gap-2">
                             <CheckCircle2 className="w-12 h-12 text-green-500" />
                            <CardTitle className="text-3xl font-headline">كل الأنظمة شغالة</CardTitle>
                            <CardDescription>
                                جميع خدماتنا تعمل بشكل طبيعي. لا توجد أي مشاكل حالية.
                            </CardDescription>
                        </div>
                    ) : (
                         <CardTitle>توجد مشاكل في بعض الخدمات</CardTitle>
                    )}
                </CardHeader>
                <CardContent className="text-right">
                    <div className="space-y-4">
                        {services.map((service) => (
                            <div key={service.name}>
                                <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <service.icon className="w-5 h-5 text-muted-foreground" />
                                        <span>{service.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                                        <span className="text-sm font-medium text-green-600">{service.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </main>
      </div>
    </div>
  );
}
