import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function useCheckout() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(planId: string) {
    const profileId = user?.id ?? (user as any)?.profile?.id;
    if (!profileId) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const origin = window.location.origin;
      const res = await fetch(`${API_BASE}/payment/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          profileId,
          successUrl: `${origin}/success`,
          failureUrl: `${origin}/failure`,
        }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error || 'فشل إنشاء رابط الدفع');
        return;
      }

      window.location.href = data.url;
    } catch {
      setError('تعذّر الاتصال ببوابة الدفع');
    } finally {
      setIsLoading(false);
    }
  }

  return { startCheckout, isLoading, error };
}
