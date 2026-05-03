'use client';

import { RegisterForm } from "@/components/auth/RegisterForm";
import { Logo } from "@/components/shared/Logo";
import { useLanguage } from "@/components/shared/LanguageContext";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export default function RegisterPage() {
  const { locale, dir } = useLanguage();
  const isRTL = locale === 'ar';
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4" dir={dir}>
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="w-full space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-block">
                  <Logo />
                </div>
                <h1 className="font-headline text-2xl font-bold">
                  {isRTL ? 'أنشئ حسابك الآن' : 'Create Your Account'}
                </h1>
                <p className="text-muted-foreground">
                  {isRTL 
                    ? 'سجّل بياناتك للانضمام إلى منصتنا والبدء في إدارة نشاطك بذكاء.'
                    : 'Register your details to join our platform and start managing your business smartly.'}
                </p>
            </div>
            <div className="bg-card p-6 sm:p-8 rounded-2xl border shadow-sm">
              <RegisterForm />
            </div>
        </div>
      </div>
    </div>
  );
}
