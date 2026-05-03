'use client';

import { Link } from 'wouter';
import { Logo } from '@/components/shared/Logo';
import { Separator } from '@/components/ui/separator';
import { InstagramIcon, WhatsAppIcon } from '@/components/shared/SocialIcons';
import { Mail } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="mt-0 border-t border-gray-100 rounded-t-3xl bg-white py-16 md:py-20" dir="rtl">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl text-right">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
          <div className="col-span-2 md:col-span-4 lg:col-span-2 space-y-6">
            <Logo />
            <p className="text-gray-500 max-w-xs font-medium leading-relaxed">
              الواجهة الرقمية المتكاملة لنمو المطاعم والمقاهي في المملكة العربية السعودية.
            </p>
            <div className="flex gap-4 justify-end">
              <a href="https://www.instagram.com/mershhah/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-primary transition-colors cursor-pointer">
                <InstagramIcon size={20} />
              </a>
              <a href="https://wa.me/966560766880" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-primary transition-colors cursor-pointer">
                <WhatsAppIcon size={20} />
              </a>
              <a href="mailto:info@mershhah.com" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-primary transition-colors cursor-pointer">
                <Mail size={20} />
              </a>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-black text-gray-900">المنتج</h4>
            <ul className="space-y-3 text-sm font-medium text-gray-500">
              <li><Link href="/pricing" className="hover:text-primary transition-colors">الأسعار</Link></li>
              <li><Link href="/blog" className="hover:text-primary transition-colors">المدونة</Link></li>
              <li><Link href="/status" className="hover:text-primary transition-colors">حالة النظام</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-black text-gray-900">تعرف علينا</h4>
            <ul className="space-y-3 text-sm font-medium text-gray-500">
              <li><Link href="/about" className="hover:text-primary transition-colors">من نحن</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">تواصل معنا</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-black text-gray-900">قانوني</h4>
            <ul className="space-y-3 text-sm font-medium text-gray-500">
              <li><Link href="/terms" className="hover:text-primary transition-colors">الشروط والأحكام</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">سياسة الخصوصية</Link></li>
            </ul>
          </div>
        </div>
        <Separator className="my-16 bg-gray-100" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
            مدعوم بواسطة مرشح
          </p>
          <p className="text-sm font-bold text-gray-400">
            صُنع بكل حب في السعودية 🇸🇦
          </p>
        </div>
      </div>
    </footer>
  );
}
