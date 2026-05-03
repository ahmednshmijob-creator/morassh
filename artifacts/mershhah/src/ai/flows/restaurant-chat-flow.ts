export type RestaurantChatInput = { customerMessage: string; restaurantData: string; locale?: 'ar' | 'en' };
export type RestaurantChatOutput = { smartReply: string; showApplications?: boolean; showBranches?: boolean };
export async function restaurantChat(input: RestaurantChatInput): Promise<RestaurantChatOutput> {
  const res = await fetch('/api/ai/restaurant-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) return { smartReply: 'عفواً، واجهتني مشكلة فنية. حاول مرة ثانية.', showApplications: false, showBranches: false };
  return res.json();
}