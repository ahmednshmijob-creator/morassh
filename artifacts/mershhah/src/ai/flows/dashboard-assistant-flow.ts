export type AssistantInput = { question: string; currentPage: string; menuItems?: any[]; locale?: 'ar' | 'en' };
export type AssistantOutput = { answer: string; generatedImage?: string; suggestedAction?: { actionLabel: string; actionType: string; actionPayload: any } };
export async function dashboardAssistant(input: AssistantInput): Promise<AssistantOutput> {
  const res = await fetch('/api/ai/dashboard-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error('AI request failed');
  return res.json();
}