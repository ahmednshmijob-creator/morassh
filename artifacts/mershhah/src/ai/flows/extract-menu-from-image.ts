export type ExtractMenuFromImageInput = { imageDataUri: string };
export type ExtractMenuFromImageOutput = { items: any[] };
export async function extractMenuFromImage(input: ExtractMenuFromImageInput): Promise<ExtractMenuFromImageOutput> {
  const res = await fetch('/api/ai/extract-menu-from-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error('AI request failed');
  return res.json();
}