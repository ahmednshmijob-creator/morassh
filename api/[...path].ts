// @ts-nocheck
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/api/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// ── Payment ─────────────────────────────────────────────────────────────────
const STREAMPAY_BASE = 'https://stream-app-service.streampay.sa';
const SP_KEY = process.env.STREAMPAY_API_KEY ?? '';
const SP_SECRET = process.env.STREAMPAY_API_SECRET ?? '';
const SB_URL = process.env.VITE_SUPABASE_URL ?? '';
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function getSupabase() {
  return createClient(SB_URL, SB_SERVICE);
}

function streamHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': SP_KEY,
    'x-api-secret': SP_SECRET,
  };
}

app.post('/api/payment/create-checkout', async (req: Request, res: Response) => {
  try {
    const { planId, profileId, successUrl, failureUrl } = req.body as {
      planId: string; profileId: string; successUrl: string; failureUrl: string;
    };
    if (!planId || !profileId) { res.status(400).json({ error: 'planId و profileId مطلوبان' }); return; }

    const sb = getSupabase();
    const { data: plan, error: planErr } = await sb.from('plans')
      .select('id, name, price, duration_months, payment_link').eq('id', planId).single();
    if (planErr || !plan) { res.status(404).json({ error: 'الباقة غير موجودة' }); return; }
    if ((plan as any).price === 0) { res.status(400).json({ error: 'هذه الباقة مجانية ولا تحتاج دفع' }); return; }

    if (!SP_KEY || !SP_SECRET) {
      if ((plan as any).payment_link) { res.json({ url: (plan as any).payment_link }); return; }
      res.status(503).json({ error: 'بوابة الدفع غير مهيأة' }); return;
    }

    const { data: profile } = await sb.from('profiles')
      .select('email, full_name, phone_number').eq('id', profileId).single();

    let consumerId: string | undefined;
    if ((profile as any)?.email) {
      try {
        const cr = await fetch(`${STREAMPAY_BASE}/api/v2/consumers`, {
          method: 'POST', headers: streamHeaders(),
          body: JSON.stringify({ name: (profile as any).full_name || 'مستخدم مرشح', email: (profile as any).email, phone: (profile as any).phone_number || undefined, external_id: profileId }),
        });
        const cd = await cr.json() as { id?: string };
        if (cd?.id) consumerId = cd.id;
      } catch { /* ignore */ }
    }

    const linkBody: Record<string, unknown> = {
      name: `اشتراك ${(plan as any).name} - مرشح`,
      description: `اشتراك في باقة ${(plan as any).name} لمنصة مرشح`,
      success_url: successUrl || `${req.headers.origin}/success`,
      failure_url: failureUrl || `${req.headers.origin}/failure`,
      metadata: { plan_id: planId, profile_id: profileId, duration_months: (plan as any).duration_months },
    };
    if (consumerId) linkBody.organization_consumer_id = consumerId;

    const linkRes = await fetch(`${STREAMPAY_BASE}/api/v2/payment_links`, {
      method: 'POST', headers: streamHeaders(), body: JSON.stringify(linkBody),
    });
    const linkData = await linkRes.json() as { url?: string; checkout_url?: string; id?: string; error?: { message?: string } };
    const checkoutUrl = linkData.url || linkData.checkout_url;

    if (!checkoutUrl) {
      console.error('[payment] StreamPay response:', linkData);
      if ((plan as any).payment_link) { res.json({ url: (plan as any).payment_link }); return; }
      res.status(502).json({ error: 'فشل إنشاء رابط الدفع', details: linkData }); return;
    }
    res.json({ url: checkoutUrl, linkId: linkData.id });
  } catch (err) {
    console.error('[payment/create-checkout]', err);
    res.status(500).json({ error: 'خطأ داخلي في السيرفر' });
  }
});

app.post('/api/payment/webhook', async (req: Request, res: Response) => {
  try {
    const event = req.body as { event?: string; type?: string; data?: { metadata?: { plan_id?: string; profile_id?: string; duration_months?: number }; status?: string } };
    const eventType = event.event || event.type || '';
    const isPaid = eventType.toLowerCase().includes('paid') || eventType.toLowerCase().includes('success') || eventType.toLowerCase().includes('completed');
    if (!isPaid) { res.json({ received: true }); return; }

    const metadata = event.data?.metadata;
    const planId = metadata?.plan_id;
    const profileId = metadata?.profile_id;
    const durationMonths = metadata?.duration_months ?? 1;
    if (!planId || !profileId) { res.status(400).json({ error: 'بيانات ناقصة' }); return; }

    const sb = getSupabase();
    const { data: plan } = await sb.from('plans').select('name').eq('id', planId).single();
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const { error: subErr } = await sb.from('subscriptions').upsert(
      { profile_id: profileId, plan_id: planId, plan_name: (plan as any)?.name || planId, status: 'active', start_date: now.toISOString(), end_date: endDate.toISOString() },
      { onConflict: 'profile_id' }
    );
    if (subErr) { console.error('[webhook] subscription upsert error:', subErr); res.status(500).json({ error: 'فشل تفعيل الاشتراك' }); return; }
    await sb.from('restaurants').update({ is_paid_plan: true }).eq('owner_id', profileId);
    res.json({ success: true });
  } catch (err) {
    console.error('[payment/webhook]', err);
    res.status(500).json({ error: 'خطأ داخلي' });
  }
});

// ── AI ───────────────────────────────────────────────────────────────────────
function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function safeJson(res: Response, err: unknown, fallback: object) {
  console.error('[ai-route]', err);
  res.json(fallback);
}

async function chatComplete(messages: OpenAI.Chat.ChatCompletionMessageParam[], schemaName: string, schema: object, maxTokens = 1024) {
  const ai = getOpenAI();
  const completion = await ai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_completion_tokens: maxTokens,
    messages,
    response_format: { type: 'json_schema', json_schema: { name: schemaName, schema: schema as Record<string, unknown>, strict: true } },
  });
  return JSON.parse(completion.choices[0]?.message?.content ?? '{}');
}

app.post('/api/ai/restaurant-chat', async (req: Request, res: Response) => {
  try {
    const { customerMessage, restaurantData, locale } = req.body as { customerMessage: string; restaurantData: string; locale?: 'ar' | 'en' };
    const lang = locale === 'en' ? 'English' : 'Arabic';
    const result = await chatComplete([
      { role: 'system', content: `You are a helpful AI assistant for a restaurant. Restaurant info: ${restaurantData}. Reply in ${lang}. Be concise and friendly.` },
      { role: 'user', content: customerMessage },
    ], 'chat_response', { type: 'object', properties: { smartReply: { type: 'string' }, showApplications: { type: 'boolean' }, showBranches: { type: 'boolean' } }, required: ['smartReply'], additionalProperties: false }, 512);
    res.json(result);
  } catch (err) { safeJson(res, err, { smartReply: 'عفواً، واجهتني مشكلة فنية.', showApplications: false, showBranches: false }); }
});

app.post('/api/ai/analyze-menu-health', async (req: Request, res: Response) => {
  try {
    const { menuItems, restaurantName } = req.body as { menuItems: unknown[]; restaurantName: string };
    const result = await chatComplete([
      { role: 'user', content: `Analyze menu health for "${restaurantName}". Menu: ${JSON.stringify(menuItems)}. Return JSON: { healthScore: number (0-100), insights: string[], recommendations: string[] }` },
    ], 'menu_health', { type: 'object', properties: { healthScore: { type: 'number' }, insights: { type: 'array', items: { type: 'string' } }, recommendations: { type: 'array', items: { type: 'string' } } }, required: ['healthScore', 'insights', 'recommendations'], additionalProperties: false });
    res.json(result);
  } catch (err) { safeJson(res, err, { healthScore: 0, insights: [], recommendations: [] }); }
});

app.post('/api/ai/analyze-reviews', async (req: Request, res: Response) => {
  try {
    const { reviews, restaurantName } = req.body as { reviews: unknown[]; restaurantName: string };
    const result = await chatComplete([
      { role: 'user', content: `Analyze reviews for "${restaurantName}". Reviews: ${JSON.stringify(reviews)}. Return JSON: { positiveThemes: string[], negativeThemes: string[], actionableInsight: string, sentimentScore: number (0-1) }` },
    ], 'review_analysis', { type: 'object', properties: { positiveThemes: { type: 'array', items: { type: 'string' } }, negativeThemes: { type: 'array', items: { type: 'string' } }, actionableInsight: { type: 'string' }, sentimentScore: { type: 'number' } }, required: ['positiveThemes', 'negativeThemes', 'actionableInsight', 'sentimentScore'], additionalProperties: false });
    res.json(result);
  } catch (err) { safeJson(res, err, { positiveThemes: [], negativeThemes: [], actionableInsight: '', sentimentScore: 0.5 }); }
});

app.post('/api/ai/dashboard-assistant', async (req: Request, res: Response) => {
  try {
    const { question, currentPage, menuItems, locale } = req.body as { question: string; currentPage: string; menuItems?: unknown[]; locale?: 'ar' | 'en' };
    const lang = locale === 'en' ? 'English' : 'Arabic';
    const result = await chatComplete([
      { role: 'system', content: `You are a restaurant dashboard assistant. Current page: ${currentPage}. Menu: ${JSON.stringify(menuItems ?? [])}. Reply in ${lang}.` },
      { role: 'user', content: question },
    ], 'assistant_response', { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false });
    res.json(result);
  } catch (err) { safeJson(res, err, { answer: 'عذراً، حدث خطأ.' }); }
});

app.post('/api/ai/extract-menu-from-image', async (req: Request, res: Response) => {
  try {
    const { imageDataUri } = req.body as { imageDataUri: string };
    const ai = getOpenAI();
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini', max_completion_tokens: 2048,
      messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageDataUri } }, { type: 'text', text: 'Extract all menu items. Return JSON: { items: [ { name: string, description: string, price: number, category: string } ] }' }] }],
      response_format: { type: 'json_schema', json_schema: { name: 'menu_extraction', schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, price: { type: 'number' }, category: { type: 'string' } }, required: ['name', 'description', 'price', 'category'], additionalProperties: false } } }, required: ['items'], additionalProperties: false } as Record<string, unknown>, strict: true } },
    });
    res.json(JSON.parse(completion.choices[0]?.message?.content ?? '{"items":[]}'));
  } catch (err) { safeJson(res, err, { items: [] }); }
});

app.post('/api/ai/generate-menu-descriptions', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: unknown[] };
    const result = await chatComplete([
      { role: 'user', content: `Generate appealing Arabic descriptions for: ${JSON.stringify(items)}. Return JSON: { items: array with same structure but improved description field }` },
    ], 'menu_descriptions', { type: 'object', properties: { items: { type: 'array', items: { type: 'object', additionalProperties: true } } }, required: ['items'], additionalProperties: false }, 2048);
    res.json(result);
  } catch (err) { safeJson(res, err, { items: [] }); }
});

app.post('/api/ai/summarize-feedback', async (req: Request, res: Response) => {
  try {
    const { chatMessages } = req.body as { chatMessages: Array<{ text: string; timestamp: string }> };
    const result = await chatComplete([
      { role: 'user', content: `Summarize customer feedback: ${JSON.stringify(chatMessages)}. Return JSON: { summary: string, frequentTopics: string[], customerSentiment: string, peakHours: string }` },
    ], 'feedback_summary', { type: 'object', properties: { summary: { type: 'string' }, frequentTopics: { type: 'array', items: { type: 'string' } }, customerSentiment: { type: 'string' }, peakHours: { type: 'string' } }, required: ['summary', 'frequentTopics', 'customerSentiment', 'peakHours'], additionalProperties: false });
    res.json(result);
  } catch (err) { safeJson(res, err, { summary: '', frequentTopics: [], customerSentiment: 'محايد', peakHours: '' }); }
});

app.post('/api/ai/generate-daily-pulse', async (req: Request, res: Response) => {
  try {
    const { restaurantName, mostDiscussedItem, peakActivityHour, totalInteractions } = req.body as { restaurantName: string; mostDiscussedItem: string; peakActivityHour: string; totalInteractions: number };
    const result = await chatComplete([
      { role: 'user', content: `Generate daily pulse report in Arabic for "${restaurantName}". Most discussed: ${mostDiscussedItem}. Peak hour: ${peakActivityHour}. Interactions: ${totalInteractions}. Return JSON: { pulseSummary: string, singleActionableRecommendation: string }` },
    ], 'daily_pulse', { type: 'object', properties: { pulseSummary: { type: 'string' }, singleActionableRecommendation: { type: 'string' } }, required: ['pulseSummary', 'singleActionableRecommendation'], additionalProperties: false }, 512);
    res.json(result);
  } catch (err) { safeJson(res, err, { pulseSummary: '', singleActionableRecommendation: '' }); }
});

app.post('/api/ai/generate-reply-templates', async (req: Request, res: Response) => {
  try {
    const { scenario, restaurantName } = req.body as { scenario: string; restaurantName: string };
    const result = await chatComplete([
      { role: 'user', content: `Generate Arabic customer reply templates for "${restaurantName}" for scenario: "${scenario}". Return JSON: { shortReply: string, empatheticReply: string, deEscalationReply: string }` },
    ], 'reply_templates', { type: 'object', properties: { shortReply: { type: 'string' }, empatheticReply: { type: 'string' }, deEscalationReply: { type: 'string' } }, required: ['shortReply', 'empatheticReply', 'deEscalationReply'], additionalProperties: false });
    res.json(result);
  } catch (err) { safeJson(res, err, { shortReply: '', empatheticReply: '', deEscalationReply: '' }); }
});

app.post('/api/ai/generate-smart-offers', async (req: Request, res: Response) => {
  try {
    const { menuItems, restaurantName } = req.body as { menuItems: unknown[]; restaurantName: string };
    const result = await chatComplete([
      { role: 'user', content: `Suggest smart offers for "${restaurantName}". Menu: ${JSON.stringify(menuItems)}. Return JSON: { offers: [ { title: string, description: string, discount: string, targetItems: string[] } ] }` },
    ], 'smart_offers', { type: 'object', properties: { offers: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, discount: { type: 'string' }, targetItems: { type: 'array', items: { type: 'string' } } }, required: ['title', 'description', 'discount', 'targetItems'], additionalProperties: false } } }, required: ['offers'], additionalProperties: false });
    res.json(result);
  } catch (err) { safeJson(res, err, { offers: [] }); }
});

app.post('/api/ai/generate-weekly-content', async (req: Request, res: Response) => {
  try {
    const { restaurantName, restaurantType, optionalTheme } = req.body as { restaurantName: string; restaurantType: string; optionalTheme?: string };
    const result = await chatComplete([
      { role: 'user', content: `Generate 7-day social media plan in Arabic for "${restaurantName}" (${restaurantType})${optionalTheme ? `, theme: ${optionalTheme}` : ''}. Return JSON: { posts: [ { day: string, casualCopy: string, formalCopy: string, hashtags: string, cta: string } ] }` },
    ], 'weekly_content', { type: 'object', properties: { posts: { type: 'array', items: { type: 'object', properties: { day: { type: 'string' }, casualCopy: { type: 'string' }, formalCopy: { type: 'string' }, hashtags: { type: 'string' }, cta: { type: 'string' } }, required: ['day', 'casualCopy', 'formalCopy', 'hashtags', 'cta'], additionalProperties: false } } }, required: ['posts'], additionalProperties: false }, 2048);
    res.json(result);
  } catch (err) { safeJson(res, err, { posts: [] }); }
});

app.post('/api/ai/suggest-color-palette', async (req: Request, res: Response) => {
  try {
    const { restaurantType, mood } = req.body as { restaurantType: string; mood?: string };
    const result = await chatComplete([
      { role: 'user', content: `Suggest color palette for "${restaurantType}"${mood ? ` with "${mood}" mood` : ''}. Return JSON: { primary: string (hex), secondary: string (hex), accent: string (hex) }` },
    ], 'color_palette', { type: 'object', properties: { primary: { type: 'string' }, secondary: { type: 'string' }, accent: { type: 'string' } }, required: ['primary', 'secondary', 'accent'], additionalProperties: false }, 256);
    res.json(result);
  } catch (err) { safeJson(res, err, { primary: '#1a1a1a', secondary: '#f5f5f5', accent: '#e63946' }); }
});

app.post('/api/ai/suggest-menu-combo', async (req: Request, res: Response) => {
  try {
    const { menuItems, peopleCount, budget, preferences } = req.body as { menuItems: unknown[]; peopleCount: number; budget: number; preferences?: string };
    const result = await chatComplete([
      { role: 'user', content: `Suggest menu combo in Arabic for ${peopleCount} people, budget ${budget} SAR${preferences ? `, prefs: ${preferences}` : ''}. Menu: ${JSON.stringify(menuItems)}. Return JSON: { suggestedItems: [ { name: string, quantity: number, reason: string } ], totalPrice: number, summary: string }` },
    ], 'menu_combo', { type: 'object', properties: { suggestedItems: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'number' }, reason: { type: 'string' } }, required: ['name', 'quantity', 'reason'], additionalProperties: false } }, totalPrice: { type: 'number' }, summary: { type: 'string' } }, required: ['suggestedItems', 'totalPrice', 'summary'], additionalProperties: false });
    res.json(result);
  } catch (err) { safeJson(res, err, { suggestedItems: [], totalPrice: 0, summary: '' }); }
});

app.post('/api/ai/summarize-public-reviews', async (req: Request, res: Response) => {
  try {
    const { reviews } = req.body as { reviews: unknown[] };
    const result = await chatComplete([
      { role: 'user', content: `Summarize reviews in Arabic (2-3 sentences): ${JSON.stringify(reviews)}. Return JSON: { summary: string }` },
    ], 'reviews_summary', { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false }, 512);
    res.json(result);
  } catch (err) { safeJson(res, err, { summary: '' }); }
});

app.post('/api/ai/generate-menu-image', async (req: Request, res: Response) => {
  try {
    const { itemName, itemDescription, style, customInstructions } = req.body as { itemName: string; itemDescription?: string; style: string; customInstructions?: string };
    const styleMap: Record<string, string> = { clean_white_background: 'on a clean white background, professional food photography', realistic_restaurant_setting: 'in a realistic restaurant setting, warm ambient lighting', dramatic_charcoal_sketch: 'as a dramatic charcoal sketch illustration', vibrant_watercolor_art: 'as vibrant watercolor art' };
    const prompt = `A high-quality food photo of "${itemName}"${itemDescription ? ` (${itemDescription})` : ''}, ${styleMap[style] ?? style}${customInstructions ? `. ${customInstructions}` : ''}.`;
    const ai = getOpenAI();
    const imgRes = await ai.images.generate({ model: 'dall-e-3', prompt, size: '1024x1024', response_format: 'b64_json' });
    res.json({ imageDataUri: `data:image/png;base64,${imgRes.data[0]?.b64_json ?? ''}` });
  } catch (err) { safeJson(res, err, { imageDataUri: '' }); }
});

app.post('/api/ai/generate-offer-image', async (req: Request, res: Response) => {
  try {
    const { offerTitle, offerDescription, style, includedItems } = req.body as { offerTitle: string; offerDescription?: string; style: string; includedItems?: Array<{ name: string }> };
    const styleMap: Record<string, string> = { modern_and_bold: 'modern and bold graphic design', elegant_and_minimalist: 'elegant minimalist design with gold accents', fun_and_festive: 'fun and festive design' };
    const itemsList = includedItems?.map((i) => i.name).join(', ');
    const prompt = `Promotional offer image for "${offerTitle}"${offerDescription ? `: ${offerDescription}` : ''}${itemsList ? `. Items: ${itemsList}` : ''}. Style: ${styleMap[style] ?? style}.`;
    const ai = getOpenAI();
    const imgRes = await ai.images.generate({ model: 'dall-e-3', prompt, size: '1024x1024', response_format: 'b64_json' });
    res.json({ imageDataUri: `data:image/png;base64,${imgRes.data[0]?.b64_json ?? ''}` });
  } catch (err) { safeJson(res, err, { imageDataUri: '' }); }
});

app.post('/api/ai/search-places', async (req: Request, res: Response) => {
  try {
    const { query, location } = req.body as { query: string; location?: string };
    const result = await chatComplete([
      { role: 'user', content: `Generate mock search results for "${query}"${location ? ` near ${location}` : ''}. Return JSON: { places: [ { placeId: string, name: string, address: string } ] } with 3-5 results.` },
    ], 'search_places', { type: 'object', properties: { places: { type: 'array', items: { type: 'object', properties: { placeId: { type: 'string' }, name: { type: 'string' }, address: { type: 'string' } }, required: ['placeId', 'name', 'address'], additionalProperties: false } } }, required: ['places'], additionalProperties: false }, 512);
    res.json(result);
  } catch (err) { safeJson(res, err, { places: [] }); }
});

app.post('/api/ai/fetch-place-details', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.body as { placeId: string };
    const result = await chatComplete([
      { role: 'user', content: `Generate mock place details for placeId "${placeId}". Return JSON: { name: string, address: string, phone: string, rating: number }` },
    ], 'place_details', { type: 'object', properties: { name: { type: 'string' }, address: { type: 'string' }, phone: { type: 'string' }, rating: { type: 'number' } }, required: ['name', 'address', 'phone', 'rating'], additionalProperties: false }, 256);
    res.json(result);
  } catch (err) { safeJson(res, err, { name: '', address: '', phone: '', rating: 0 }); }
});

export default app;
