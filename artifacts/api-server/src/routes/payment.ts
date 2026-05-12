import { Router, type IRouter, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router: IRouter = Router();

const STREAMPAY_BASE = "https://stream-app-service.streampay.sa";
const API_KEY = process.env.STREAMPAY_API_KEY!;
const API_SECRET = process.env.STREAMPAY_API_SECRET!;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function streamHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "x-api-secret": API_SECRET,
  };
}

router.post("/create-checkout", async (req: Request, res: Response) => {
  try {
    const { planId, profileId, successUrl, failureUrl } = req.body as {
      planId: string;
      profileId: string;
      successUrl: string;
      failureUrl: string;
    };

    if (!planId || !profileId) {
      res.status(400).json({ error: "planId و profileId مطلوبان" });
      return;
    }

    const supabase = getSupabase();

    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("id, name, price, duration_months, payment_link")
      .eq("id", planId)
      .single();

    if (planErr || !plan) {
      res.status(404).json({ error: "الباقة غير موجودة" });
      return;
    }

    if (plan.price === 0) {
      res.status(400).json({ error: "هذه الباقة مجانية ولا تحتاج دفع" });
      return;
    }

    if (!API_KEY || !API_SECRET) {
      if (plan.payment_link) {
        res.json({ url: plan.payment_link });
        return;
      }
      res.status(503).json({ error: "بوابة الدفع غير مهيأة" });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, phone_number")
      .eq("id", profileId)
      .single();

    let consumerId: string | undefined;

    if (profile?.email) {
      try {
        const consumerRes = await fetch(`${STREAMPAY_BASE}/api/v2/consumers`, {
          method: "POST",
          headers: streamHeaders(),
          body: JSON.stringify({
            name: profile.full_name || "مستخدم مرشح",
            email: profile.email,
            phone: profile.phone_number || undefined,
            external_id: profileId,
          }),
        });
        const consumerData = await consumerRes.json() as { id?: string };
        if (consumerData?.id) consumerId = consumerData.id;
      } catch {
        // proceed without consumer id
      }
    }

    const linkBody: Record<string, unknown> = {
      name: `اشتراك ${plan.name} - مرشح`,
      description: `اشتراك في باقة ${plan.name} لمنصة مرشح`,
      success_url: successUrl || `${req.headers.origin}/success`,
      failure_url: failureUrl || `${req.headers.origin}/failure`,
      metadata: {
        plan_id: planId,
        profile_id: profileId,
        duration_months: plan.duration_months,
      },
    };

    if (consumerId) linkBody.organization_consumer_id = consumerId;

    const linkRes = await fetch(`${STREAMPAY_BASE}/api/v2/payment_links`, {
      method: "POST",
      headers: streamHeaders(),
      body: JSON.stringify(linkBody),
    });

    const linkData = await linkRes.json() as { url?: string; checkout_url?: string; id?: string; error?: { message?: string } };

    const checkoutUrl = linkData.url || linkData.checkout_url;
    if (!checkoutUrl) {
      console.error("[payment] StreamPay response:", linkData);
      // Graceful fallback: use the static payment_link stored on the plan
      if (plan.payment_link) {
        console.log("[payment] Falling back to static payment_link for plan", planId);
        res.json({ url: plan.payment_link });
        return;
      }
      res.status(502).json({ error: "فشل إنشاء رابط الدفع", details: linkData });
      return;
    }

    res.json({ url: checkoutUrl, linkId: linkData.id });
  } catch (err) {
    console.error("[payment/create-checkout]", err);
    res.status(500).json({ error: "خطأ داخلي في السيرفر" });
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const event = req.body as {
      event?: string;
      type?: string;
      data?: {
        metadata?: { plan_id?: string; profile_id?: string; duration_months?: number };
        payment_link_id?: string;
        status?: string;
      };
    };

    const eventType = event.event || event.type || "";
    const isPaid =
      eventType.toLowerCase().includes("paid") ||
      eventType.toLowerCase().includes("success") ||
      eventType.toLowerCase().includes("completed");

    if (!isPaid) {
      res.json({ received: true });
      return;
    }

    const metadata = event.data?.metadata;
    const planId = metadata?.plan_id;
    const profileId = metadata?.profile_id;
    const durationMonths = metadata?.duration_months ?? 1;

    if (!planId || !profileId) {
      res.status(400).json({ error: "بيانات ناقصة في الـ webhook" });
      return;
    }

    const supabase = getSupabase();

    const { data: plan } = await supabase
      .from("plans")
      .select("name")
      .eq("id", planId)
      .single();

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const { error: subErr } = await supabase.from("subscriptions").upsert(
      {
        profile_id: profileId,
        plan_id: planId,
        plan_name: plan?.name || planId,
        status: "active",
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
      },
      { onConflict: "profile_id" }
    );

    if (subErr) {
      console.error("[webhook] subscription upsert error:", subErr);
      res.status(500).json({ error: "فشل تفعيل الاشتراك" });
      return;
    }

    await supabase
      .from("restaurants")
      .update({ is_paid_plan: true })
      .eq("owner_id", profileId);

    console.log(`[webhook] ✓ Activated subscription for profile ${profileId} — plan ${planId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[payment/webhook]", err);
    res.status(500).json({ error: "خطأ داخلي" });
  }
});

export default router;
