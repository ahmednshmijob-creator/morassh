
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Logo } from "@/components/shared/Logo";

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto inline-block">
              <Logo />
            </div>
            <h1 className="font-headline text-2xl font-bold">نسيت كلمة المرور؟</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              عادي تصير. حط إيميلك وبنرسل لك رابط عشان تسوي كلمة مرور جديدة.
            </p>
          </div>
          <div className="bg-card p-6 sm:p-8 rounded-2xl border shadow-sm">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
