'use client';

import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { InstagramIcon, WhatsAppIcon } from "@/components/shared/SocialIcons";

const contactChannels = [
  {
    title: "البريد الإلكتروني",
    description: "للاستفسارات العامة والدعم",
    href: "mailto:info@mershhah.com",
    icon: Mail,
    label: "info@mershhah.com",
  },
  {
    title: "واتساب",
    description: "رد سريع على استفساراتك",
    href: "https://wa.me/966560766880",
    icon: WhatsAppIcon,
    label: "تواصل عبر واتساب",
  },
  {
    title: "إنستغرام",
    description: "تابعنا وأرسل رسالة",
    href: "https://www.instagram.com/mershhah/",
    icon: InstagramIcon,
    label: "@mershhah",
  },
];

export default function ContactPage() {
  return (
    <div className="bg-white text-foreground min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <header className="py-6 flex justify-between items-center border-b">
          <Logo />
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للرئيسية
            </Link>
          </Button>
        </header>

        <main className="py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-headline font-extrabold mb-4">
              تواصل معنا
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              نسعد بتواصلك. اختر القناة المناسبة وسنرد عليك في أقرب وقت.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {contactChannels.map((channel, index) => (
              <motion.div
                key={channel.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <a
                  href={channel.href}
                  target={channel.href.startsWith("http") ? "_blank" : undefined}
                  rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="block h-full"
                >
                  <Card className="h-full border shadow-sm hover:shadow-md hover:border-primary/20 transition-all text-right">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                        <channel.icon size={24} className="shrink-0" />
                      </div>
                      <h3 className="text-lg font-bold mb-1">{channel.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {channel.description}
                      </p>
                      <span className="text-sm font-medium text-primary">
                        {channel.label}
                      </span>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
