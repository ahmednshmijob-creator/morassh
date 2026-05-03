'use client';

import { useState, useEffect } from 'react';
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Target, Eye, Handshake, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PublicFooter } from "@/components/shared/PublicFooter";

const values = [
    {
        icon: Sparkles,
        title: 'الابتكار',
        description: 'نبحث باستمرار عن حلول تقنية مبتكرة لتبسيط تعقيدات إدارة المشاريع في قطاع الأغذية والمشروبات.'
    },
    {
        icon: Handshake,
        title: 'الشراكة',
        description: 'نحن نؤمن بأن نجاحنا يقاس بنجاح شركائنا من أصحاب المشاريع.'
    },
    {
        icon: Target,
        title: 'التركيز على النتائج',
        description: 'نصمم أدواتنا لمساعدتك على تحقيق نتائج ملموسة، من زيادة المبيعات إلى تعزيز ولاء العملاء.'
    }
];

export default function AboutPage() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="bg-white text-foreground min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Header */}
        <header className="py-6 flex justify-between items-center border-b">
          <Logo />
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للرئيسية
            </Link>
          </Button>
        </header>

        {/* Hero — نبذة وقصة شخصية */}
        <main className="py-16 md:py-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold mb-6">
              من نحن
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              أنا أحمد، بنيت «مرشح» كمشروع فردي — منصة رقمية واحدة تجمع للمطاعم والمقاهي المنيو، المساعد الذكي، والتحليلات. المشروع يُدار بشكل مستقل في إطار وثيقة العمل الحر، وهدفي تمكين أصحاب المشاريع بأدوات بسيطة وفعّالة تناسب احتياجاتهم.
            </p>
          </motion.div>
        </main>

        {/* Vision & Mission Section */}
        <section className="py-24">
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Eye className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-headline mb-2">رؤيتنا</h2>
                  <p className="text-muted-foreground">أن نكون الشريك التقني الأول لكل مطعم ومقهى في الشرق الأوسط، ونساهم في نموهم وازدهارهم من خلال حلول ذكية ومبتكرة.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Target className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-headline mb-2">مهمتنا</h2>
                  <p className="text-muted-foreground">توفير منصة سهلة الاستخدام وقوية تدمج بين الذكاء الاصطناعي وأدوات التسويق، لمساعدة المشاريع على بناء علاقات أعمق مع عملائهم وزيادة أرباحهم.</p>
                </div>
              </div>
            </div>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative h-80 rounded-2xl overflow-hidden shadow-xl"
            >
              <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1470&auto=format&fit=crop" alt="Restaurant interior" className="object-cover w-full h-full" />
            </motion.div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 bg-muted/30 rounded-3xl">
             <div className="text-center mb-12">
                <h2 className="text-4xl font-bold font-headline">قيمنا الأساسية</h2>
                <p className="text-muted-foreground mt-2">المبادئ التي توجه كل قرار نتخذه.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
                {values.map((value, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <Card className="text-center p-6 h-full border-dashed">
                             <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block">
                                <value.icon className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                            <p className="text-muted-foreground">{value.description}</p>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </section>
        
        {/* CTA Section */}
        <section className="text-center py-24">
             <h2 className="text-3xl font-bold font-headline mb-4">هل أنت جاهز للبدء؟</h2>
             <p className="text-muted-foreground mb-8 max-w-xl mx-auto">سجّل واحصل على واجهتك الرقمية للمطعم أو المقهى.</p>
             <Button asChild size="lg">
                <Link href="/register">ابدأ الآن</Link>
             </Button>
        </section>

      </div>
      <PublicFooter />
    </div>
  );
}
