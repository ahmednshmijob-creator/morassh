'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Restaurant, Subscription } from '@/lib/types';

export type Entitlements = {
  planId: string;
  planName: string;
  endDate: Date | null;
  canUseAiAnalysis: boolean;
  canUseStudioImageGeneration: boolean;
  canUseDashboardAgent: boolean;
};

const defaultEntitlements: Entitlements = {
  planId: 'none',
  planName: 'لا يوجد',
  endDate: null,
  canUseAiAnalysis: false,
  canUseStudioImageGeneration: false,
  canUseDashboardAgent: false,
};

export type AppUser = Profile & Partial<Omit<Restaurant, 'id'>> & {
  uid: string;
  restaurantId?: string;
  entitlements: Entitlements;
};

type UserContextType = {
  user: AppUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({ user: null, isLoading: true, refreshUser: async () => {} });

function computeEntitlements(subscriptions: Subscription[], profile: Profile): Entitlements {
  const now = new Date();
  let activeSub: Subscription | null = null;

  for (const sub of subscriptions) {
    const subEndDate = sub.end_date ? new Date(sub.end_date) : new Date(0);
    if (subEndDate > now) {
      if (!activeSub) {
        activeSub = sub;
      } else {
        const currentIsPaid = activeSub.plan_id !== 'free' && activeSub.plan_id !== 'none';
        const nextIsPaid = sub.plan_id !== 'free' && sub.plan_id !== 'none';
        const activeSubEndDate = new Date(activeSub.end_date);
        if (nextIsPaid && !currentIsPaid) {
          activeSub = sub;
        } else if (nextIsPaid === currentIsPaid && subEndDate > activeSubEndDate) {
          activeSub = sub;
        }
      }
    }
  }

  if (!activeSub) return defaultEntitlements;

  const isPaidPlan = activeSub.plan_id !== 'free' && activeSub.plan_id !== 'none';
  const hasTrial = !isPaidPlan && !profile.ai_trial_used;
  const enableAi = isPaidPlan || hasTrial;

  return {
    planId: activeSub.plan_id,
    planName: activeSub.plan_name,
    endDate: new Date(activeSub.end_date),
    canUseAiAnalysis: enableAi,
    canUseStudioImageGeneration: enableAi,
    canUseDashboardAgent: enableAi,
  };
}

async function fetchUserData(userId: string): Promise<AppUser | null> {
  // First get the profile (one quick retry if it doesn't exist yet)
  let profile: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) { profile = data; break; }
    if (attempt === 0) await new Promise(r => setTimeout(r, 300));
  }

  if (!profile) return null;

  // Fetch restaurant + subscriptions in PARALLEL
  const [restaurantResult, subscriptionsResult] = await Promise.all([
    profile.role === 'owner' && profile.restaurant_id
      ? supabase.from('restaurants').select('*').eq('id', profile.restaurant_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('subscriptions').select('*').eq('profile_id', userId).eq('status', 'active'),
  ]);

  const restaurantData = restaurantResult.data ?? null;
  const entitlements = computeEntitlements(subscriptionsResult.data || [], profile);

  return {
    ...profile,
    ...(restaurantData ? { ...restaurantData } : {}),
    uid: userId,
    id: userId,
    restaurantId: restaurantData?.id || profile.restaurant_id || undefined,
    entitlements,
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (session?.user) {
      const userData = await fetchUserData(session.user.id).catch(() => null);
      setUser(userData);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Timeout fallback — 8 seconds
    const timeout = setTimeout(() => {
      if (!cancelled) { setUser(null); setIsLoading(false); }
    }, 8000);

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      if (cancelled) return;
      if (session?.user) {
        const userData = await fetchUserData(session.user.id).catch(() => null);
        if (!cancelled) setUser(userData);
      } else {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) setIsLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      if (!cancelled) { setUser(null); setIsLoading(false); }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        // Skip events that don't require user data reload
        if (event === 'INITIAL_SESSION') return;
        if (event === 'TOKEN_REFRESHED') return; // Token refreshed silently — no UI change needed

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // SIGNED_IN or USER_UPDATED — reload user data
        if (session?.user) {
          // Don't show loading spinner for background updates
          const userData = await fetchUserData(session.user.id).catch(() => null);
          if (!cancelled) setUser(userData);
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
