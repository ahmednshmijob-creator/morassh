'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { 
  BarChart3, 
  Bot, 
  Palette, 
  Store, 
  Globe, 
  TrendingUp, 
  QrCode, 
  Link as LinkIcon,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { PublicFooter } from '@/components/shared/PublicFooter';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

export default function HomePage() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const mainFeatures = [
    {
        icon: Globe,
        title: "واجهة رقمية موحدة",
        description: "رابط واحد يجمع المنيو، العروض، والفروع. يعمل كرابط في البايو أو كـ QR كود داخل الفرع."
    },
    {
        icon: Bot,
        title: "مساعد ذكي لعملائك",
        description: "يرد على استفسارات عملائك، يقترح عليهم أطباق، ويساعدهم على مدار الساعة لاتخاذ قرارات أسرع."
    },
    {
        icon: TrendingUp,
        title: "أدوات نمو ذكية",
        description: "حوّل بياناتك إلى أرباح. أدوات مثل تحليل المنيو وحاسبة الأرباح بانتظارك."
    },
    {
        icon: Palette,
        title: "استوديو الهوية",
        description: "صمم واجهاتك الرقمية بنفسك لتتناسب مع علامتك التجارية."
    },
    {
        icon: Store,
        title: "متجر أدوات إضافية",
        description: "فعّل أدوات تساعدك على النمو، مثل تقويم التسويق وكاتب المحتوى."
    },
    {
        icon: BarChart3,
        title: "تحليلات الأداء",
        description: "اتخذ قرارات مبنية على أرقام دقيقة عن أداء مشروعك وسلوك عملائك."
    }
  ];

  return (
    <div className="bg-white text-foreground min-h-screen overflow-x-hidden selection:bg-primary selection:text-white" dir="rtl">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 py-4 px-6 md:px-12 flex justify-between items-center">
          <Logo />
          <div className="flex items-center gap-2 md:gap-4">
              <LanguageSwitcher />
              {/* زر تسجيل الدخول يظهر على الجوال كزر أيقونة، وعلى الشاشات الأكبر كنص كامل */}
              <Button
                asChild
                variant="ghost"
                className="sm:hidden rounded-full px-3 py-2"
              >
                <Link href="/login">
                  <span className="text-sm font-bold">دخول</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="hidden sm:flex font-bold">
                  <Link href="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105">
                  <Link href="/register">ابدأ مجاناً</Link>
              </Button>
          </div>
      </header>

      <main className="w-full">
          {/* Hero Section */}
          <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-6 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10">
                  <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
              </div>

              <div className="container mx-auto text-center max-w-5xl">
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                      <Badge className="mb-6 bg-primary/10 text-primary border-0 font-black py-1.5 px-4 rounded-full uppercase tracking-widest text-[10px]">
                          مستقبل إدارة المطاعم والمقاهي وصل
                      </Badge>
                      <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1] tracking-tight text-gray-900">
                          الواجهة الرقمية <br className="hidden md:block" />
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">الموحدة لمشروعك</span>
                      </h1>
                      <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
                         رابط واحد يجمع كل شيء: منيو تفاعلي، مساعد ذكي لخدمة عملائك، وتحليلات دقيقة لمبيعاتك. كل هذا مصمم خصيصاً لنمو المطاعم والمقاهي.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6">
                        <Button size="lg" className="w-full sm:w-auto h-16 text-xl px-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black shadow-2xl shadow-primary/20 transition-transform active:scale-95" asChild>
                             <Link href="/register">سجل الآن مجاناً</Link>
                        </Button>
                        <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 text-xl px-10 rounded-2xl font-black border-2 hover:bg-gray-50 transition-all active:scale-95" asChild>
                            <Link href="/pricing">اكتشف الباقات</Link>
                        </Button>
                      </div>
                  </motion.div>
              </div>
          </section>

          {/* Features Grid */}
           <section className="py-24 bg-gray-50/50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20 space-y-4">
                      <h2 className="text-3xl md:text-5xl font-black text-gray-900">فريق عمل رقمي في جيبك</h2>
                      <p className="text-gray-500 max-w-2xl mx-auto font-medium">نحن لا نقدم مجرد موقع، بل نوفر لك مجموعة من الأدوات الذكية التي تعمل معاً لنمو مطعمك أو مقهاك.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {mainFeatures.map((feature, i) => (
                             <motion.div 
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                key={i} 
                                className="group p-8 border border-gray-100 rounded-[2.5rem] bg-white hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex flex-col items-center text-center"
                              >
                                  <div className="p-5 bg-gray-50 rounded-3xl mb-6 group-hover:bg-primary/10 transition-colors duration-500">
                                    <feature.icon className="h-10 w-10 text-gray-400 group-hover:text-primary transition-colors duration-500" />
                                  </div>
                                  <h3 className="font-black text-xl mb-3 text-gray-900">{feature.title}</h3>
                                  <p className="text-gray-500 leading-relaxed font-medium">{feature.description}</p>
                              </motion.div>
                        ))}
                    </div>
                </div>
           </section>

           {/* How it works Section */}
           <section className="py-24 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">بساطة في خطوتين</h2>
                        <p className="text-gray-500 font-medium">صممنا مرشّح ليكون الحل الأسرع والأذكى للخدمة الرقمية في قطاع الأغذية والمشروبات.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-gray-50 rounded-[3rem] p-10 border border-gray-100"
                        >
                            <div className="bg-primary text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl mb-6">1</div>
                            <div className="flex items-center gap-3 mb-4">
                                <QrCode className="text-primary h-8 w-8" />
                                <h3 className="text-2xl font-black">داخل الفرع (عبر QR)</h3>
                            </div>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                يمسح العميل الكود على الطاولة ليظهر له منيو تفاعلي مذهل. يرى صور الأطباق، يقرأ المكونات، ويسأل المساعد الذكي عن أي تفاصيل... تجربة رقمية تغنيك عن المنيو الورقي التقليدي.
                            </p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-primary/5 rounded-[3rem] p-10 border border-primary/10"
                        >
                            <div className="bg-primary text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl mb-6">2</div>
                            <div className="flex items-center gap-3 mb-4">
                                <LinkIcon className="text-primary h-8 w-8" />
                                <h3 className="text-2xl font-black">خارج الفرع (عبر رابط)</h3>
                            </div>
                            <p className="text-gray-600 leading-relaxed font-medium">
                                رابط واحد ذكي (Smart Link) تضعه في انستقرام أو جوجل ماب. أي شخص يبحث عنك سيجد واجهة مرتبة تحتوي على كل شيء: المنيو، الفروع، روابط التوصيل، وتقييمات العملاء.
                            </p>
                        </motion.div>
                    </div>
                </div>
           </section>

           {/* Final CTA Section */}
           <section className="py-24 px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="bg-gray-900 rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-48 -mt-48" />
                        
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-8">ابدأ رحلة التحول <br/> الرقمي اليوم</h2>
                            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium">
                                انضم لمئات المطاعم والمقاهي التي تستخدم "مرشّح" لتقديم تجربة عملاء أذكى وأسرع.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button size="lg" className="w-full sm:w-auto h-16 px-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black text-xl" asChild>
                                    <Link href="/register">ابدأ الآن مجاناً</Link>
                                </Button>
                                <Button variant="ghost" size="lg" className="w-full sm:w-auto h-16 px-12 text-white hover:bg-white/10 rounded-2xl font-black text-xl" asChild>
                                    <Link href="/pricing">عرض الباقات</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
           </section>
      </main>
      
      <PublicFooter />
    </div>
  );
}
