'use client';

import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/shared/Logo";
import { useLanguage } from "@/components/shared/LanguageContext";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export default function LoginPage() {
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
                  {isRTL ? 'تسجيل الدخول' : 'Login'}
                </h1>
                <p className="text-muted-foreground">
                  {isRTL 
                    ? 'حيّاك! أدخل بياناتك عشان توصل للوحة التحكم.' 
                    : 'Welcome! Enter your credentials to access your dashboard.'}
                </p>
            </div>
            <div className="bg-card p-6 sm:p-8 rounded-2xl border shadow-sm">
              <LoginForm />
            </div>
        </div>
      </div>
    </div>
  );
}
