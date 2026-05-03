'use client';

import PageHeader from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Store,
  UtensilsCrossed,
  Star,
  MessageCircle,
  Bot,
  Link2,
  Megaphone,
  Target,
  Lightbulb,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const pitchShort =
  "مرشح منصة رقمية متكاملة للمطاعم والمقاهي في السعودية: صفحة واحدة تجمع المنيو، الفروع، التقييمات، الدعم، والمساعد الذكي — مع ربط تطبيقات التوصيل ووسائل التواصل.";

const pitchMedium = `مرشح يساعد المطاعم والمقاهي أن يكون لها وجود رقمي واحد وواضح للعميل: صفحة هبوط (هاب) خاصة بالمطعم تعرض المنيو، الفروع، العروض، التقييمات، وفتح تذاكر الدعم. يضاف لها مساعد ذكي يجاوب عن أسئلة الزبون بلغة طبيعية ويعرّفه بالتطبيقات والفروع وطرق التواصل. كل هذا من لوحة تحكم واحدة مع إمكانية ربط تطبيقات التوصيل ووسائل التواصل.`;

const talkingPoints = [
  { title: "صفحة واحدة للعميل", desc: "رابط واحد يجمع المنيو، الفروع، العروض، التقييمات والدعم بدل توزيع الروابط." },
  { title: "مساعد ذكي بالعربي", desc: "يجيب عن أسئلة الزبون (المنيو، التوصيل، الفروع، أوقات العمل) ويُظهر أزرار واتساب والخرائط عند الحاجة." },
  { title: "ربط التوصيل والتواصل", desc: "إظهار تطبيقات التوصيل (هنقرستشن، طلبات، إلخ) ووسائل التواصل من واجهة واحدة." },
  { title: "تقييمات وسمعة", desc: "صفحة تقييمات مخصصة تساعد في بناء الثقة والسمعة." },
  { title: "لوحة تحكم للمالك", desc: "إدارة المنيو، الفروع، العروض، والإعدادات من مكان واحد." },
  { title: "أدوات إضافية (متجر)", desc: "إمكانية تفعيل أدوات مثل كتابة المحتوى والتسويق من داخل المنصة." },
];

const objections = [
  {
    objection: "عندنا موقع أو إنستقرام يكفينا",
    response: "مرشح لا يلغي الموقع أو الإنستقرام، بل يعطيك رابط واحد يجمّع كل شيء للعميل (منيو، فروع، توصيل، دعم). العميل ما يحتاج يبحث في أكثر من مكان، والمساعد الذكي يرد على أسئلته فوراً.",
  },
  {
    objection: "غالي أو الميزانية محدودة",
    response: "نقدّم باقات تناسب أحجام مختلفة من المطاعم. يمكن البدء بباقة أساسية ثم الترقية لاحقاً. تكلفة عدم وجود منصة واضحة للعميل (ضياع طلبات، أسئلة متكررة، سمعة) أعلى من اشتراك شهري منظم.",
  },
  {
    objection: "ما نعرف نستخدم تقنية معقدة",
    response: "الواجهة بالعربي وواضحة. المالك يملأ بياناته مرة واحدة (منيو، فروع، روابط التوصيل)، وبعدها الصفحة والمساعد يعملان تلقائياً. الدعم الفني متاح للمشتركين.",
  },
  {
    objection: "متى نرى النتائج؟",
    response: "بمجرد الاشتراك وإكمال الإعداد تحصل على رابط الصفحة (مرشح/اسم المطعم). يمكن مشاركته فوراً على الواتساب والإنستقرام. تحسين المحتوى (صور، عروض) يزيد التفاعل مع الوقت.",
  },
];

const features = [
  { icon: Store, title: "صفحة هاب (Hub)", desc: "رابط واحد يعرض العروض، المنيو، الفروع وروابط التوصيل والدعم." },
  { icon: UtensilsCrossed, title: "المنيو الرقمي", desc: "صفحة منيو مرتبة مع تصنيفات وصور وأسعار." },
  { icon: Target, title: "الفروع والمواقع", desc: "عرض الفروع مع العناوين، أوقات العمل، واتساب، وخرائط غوغل." },
  { icon: Star, title: "التقييمات", desc: "صفحة تقييمات مخصصة لبناء السمعة والثقة." },
  { icon: MessageCircle, title: "الدعم والتذاكر", desc: "صفحة دعم للعميل ولوحة للمالك لمتابعة المحادثات." },
  { icon: Bot, title: "المساعد الذكي", desc: "يجيب بالعربي عن المنيو، التوصيل، الفروع والمواعيد مع أزرار واتساب والخرائط." },
  { icon: Link2, title: "تطبيقات التوصيل والاجتماعيات", desc: "ربط هنقرستشن، طلبات، وإنستقرام وغيرها في مكان واحد." },
  { icon: Megaphone, title: "العروض والترويج", desc: "عرض العروض الحالية في الصفحة والهاب." },
];

export default function AdminSalesPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="دليل المبيعات"
        description="تعرف على مرشح، لمن يُوجّه، وكيف تسوق له — نقاط الحديث، الرد على الاعتراضات، والروابط المهمة."
      />

      <Tabs defaultValue="what" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/60 w-full justify-start">
          <TabsTrigger value="what">ما هو مرشح</TabsTrigger>
          <TabsTrigger value="who">لمن مرشح</TabsTrigger>
          <TabsTrigger value="features">المزايا</TabsTrigger>
          <TabsTrigger value="pitch">كيف تسوق</TabsTrigger>
          <TabsTrigger value="objections">اعتراضات شائعة</TabsTrigger>
          <TabsTrigger value="links">روابط سريعة</TabsTrigger>
        </TabsList>

        <TabsContent value="what" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                ما هو مرشح؟
              </CardTitle>
              <CardDescription>
                تعريف مختصر للمنتج تستخدمه في المحادثات والعروض التقديمية.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">{pitchMedium}</p>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium mb-1">نسخة قصيرة (سطر واحد):</p>
                <p className="text-sm text-muted-foreground">{pitchShort}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 gap-1"
                  onClick={() => handleCopy(pitchShort, "short")}
                >
                  نسخ
                  {copied === "short" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="who" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                لمن مرشح؟
              </CardTitle>
              <CardDescription>
                الشريحة المستهدفة والاستخدامات الأنسب.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>مطاعم ومقاهي في المملكة العربية السعودية.</li>
                <li>منشآت تريد وجوداً رقمياً واحداً للعميل (منيو، فروع، توصيل، دعم).</li>
                <li>من يريد مساعداً ذكياً يرد على أسئلة الزبون بالعربية.</li>
                <li>من يريد ربط تطبيقات التوصيل ووسائل التواصل في مكان واحد.</li>
                <li>المشاريع الصغيرة والمتوسطة التي تريد بداية سريعة بدون موقع معقد.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>المزايا الرئيسية</CardTitle>
              <CardDescription>
                ما يقدمه مرشح للمطعم والعميل — استخدمها في العروض والمقارنات.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {features.map((f) => (
                  <div
                    key={f.title}
                    className="flex gap-3 rounded-lg border p-4 bg-card"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{f.title}</p>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pitch" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                كيف تسوق لمرشح
              </CardTitle>
              <CardDescription>
                نقاط الحديث الأساسية في المحادثات والعروض.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                ركّز على الفائدة للعميل النهائي (المطعم): تقليل التشتت، رد أسرع على الزبون،
                وجود رقمي واحد، وربط التوصيل والتواصل.
              </p>
              <div className="space-y-3">
                {talkingPoints.map((tp) => (
                  <div key={tp.title} className="rounded-lg border p-3 bg-muted/20">
                    <p className="font-medium">{tp.title}</p>
                    <p className="text-sm text-muted-foreground">{tp.desc}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  نصيحة
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  اعرض تجربة حية: ادخل على صفحة هاب لأحد المشتركين (إن وُجدت) وورّهم المنيو، المساعد الذكي، وصفحة الفروع ليكون الحديث ملموساً.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objections" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>اعتراضات شائعة وردود مقترحة</CardTitle>
              <CardDescription>
                استخدم هذه الردود كمرجع عند الحديث مع العملاء المحتملين.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {objections.map((o) => (
                <div key={o.objection} className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium text-destructive/90">«{o.objection}»</p>
                  <p className="text-sm text-muted-foreground">{o.response}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                روابط سريعة
              </CardTitle>
              <CardDescription>
                روابط تهم فريق المبيعات والدعم.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Link href="/pricing" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    صفحة التسعير
                  </Button>
                </Link>
                <Link href="/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    الصفحة الرئيسية
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                يمكنك مشاركة رابط صفحة التسعير مع العملاء المحتملين لمعرفة الباقات والأسعار.
                الصفحة الرئيسية تعرّف بالمنتج للزوار الجدد.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
