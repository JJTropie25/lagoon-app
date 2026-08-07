import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const stripeWebhookSecretConnect =
  Deno.env.get("STRIPE_WEBHOOK_SECRET_CONNECT") ?? "";
const stripeApiVersion = "2023-10-16";

function toUint8Array(input: string) {
  return new TextEncoder().encode(input);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function computeSignature(secret: string, payload: string, timestamp: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    toUint8Array(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedPayload = `${timestamp}.${payload}`;
  const signature = await crypto.subtle.sign("HMAC", key, toUint8Array(signedPayload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
) {
  const items = signatureHeader.split(",");
  const timestamp = items
    .find((item) => item.startsWith("t="))
    ?.split("=")[1];
  const signatures = items
    .filter((item) => item.startsWith("v1="))
    .map((item) => item.split("=")[1]);
  if (!timestamp || signatures.length === 0) return false;
  const expected = await computeSignature(secret, payload, timestamp);
  return signatures.some((sig) => timingSafeEqual(sig, expected));
}

serve(async (req) => {
  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
    return new Response("Missing secrets", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  let verified = false;
  if (stripeWebhookSecret) {
    verified = await verifyStripeSignature(body, signature, stripeWebhookSecret);
  }
  if (!verified && stripeWebhookSecretConnect) {
    verified = await verifyStripeSignature(body, signature, stripeWebhookSecretConnect);
  }
  if (!verified) {
    return new Response("Webhook Error: invalid signature", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Webhook Error: invalid payload", { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  async function refreshHostStripeStatus(accountId: string) {
    // Always fetch canonical account state from Stripe before updating host flags.
    const accountRes = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Stripe-Version": stripeApiVersion,
      },
    });
    if (!accountRes.ok) {
      const body = await accountRes.text();
      console.error("stripe account fetch failed", accountRes.status, body);
      return;
    }
    const account = await accountRes.json();
    await adminClient
      .from("hosts")
      .update({
        stripe_charges_enabled: account?.charges_enabled ?? false,
        stripe_payouts_enabled: account?.payouts_enabled ?? false,
        stripe_details_submitted: account?.details_submitted ?? false,
        stripe_onboarding_complete:
          Boolean(account?.charges_enabled) && Boolean(account?.payouts_enabled),
        stripe_onboarding_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", accountId);
  }

  if (event.type === "account.updated") {
    const account = event.data.object;
    if (account?.id) {
      await refreshHostStripeStatus(account.id);
    }
  }

  if (typeof event.type === "string" && event.type.startsWith("v2.core.account")) {
    // Connect v2 events use a different envelope; derive account id from related_object/changes.
    const accountId = event?.related_object?.id ?? event?.changes?.after?.id;
    if (typeof accountId === "string" && accountId.startsWith("acct_")) {
      await refreshHostStripeStatus(accountId);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    if (intent?.id) {
      // Update booking status and payment_status
      const { data: booking } = await adminClient
        .from("bookings")
        .select("id, guest_id, service_id, slot_start")
        .eq("payment_intent_id", intent.id)
        .maybeSingle();

      await adminClient
        .from("bookings")
        .update({ status: "confirmed", payment_status: "paid" })
        .eq("payment_intent_id", intent.id);

      if (booking) {
        // Resolve host user_id via service → hosts
        const { data: service } = await adminClient
          .from("services")
          .select("title, host_id")
          .eq("id", booking.service_id)
          .maybeSingle();

        let hostUserId: string | null = null;
        if (service?.host_id) {
          const { data: host } = await adminClient
            .from("hosts")
            .select("guest_id")
            .eq("id", service.host_id)
            .maybeSingle();
          hostUserId = host?.guest_id ?? null;
        }

        const slotLabel = booking.slot_start
          ? new Date(booking.slot_start).toLocaleDateString("it-IT", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })
          : "";

        const notifications: Record<string, unknown>[] = [
          {
            user_id: booking.guest_id,
            title: "Prenotazione confermata",
            body: `Il tuo posto è assicurato${slotLabel ? ` per il ${slotLabel}` : ""}. Il QR code è disponibile.`,
            data: { booking_id: booking.id, type: "booking_confirmed" },
          },
        ];
        if (hostUserId) {
          notifications.push({
            user_id: hostUserId,
            title: "Nuova prenotazione",
            body: `Nuova prenotazione ricevuta${service?.title ? ` per ${service.title}` : ""}${slotLabel ? ` — ${slotLabel}` : ""}.`,
            data: { booking_id: booking.id, type: "booking_new" },
          });
        }

        await adminClient.from("notifications").insert(notifications);

        // Fire-and-forget: invoke send-push for immediate delivery
        fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceRoleKey}` },
        }).catch((e) => console.error("send-push invoke failed:", e));
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    if (intent?.id) {
      await adminClient
        .from("bookings")
        .update({ payment_status: "failed" })
        .eq("payment_intent_id", intent.id);
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object;
    // charge.payment_intent holds the payment_intent_id
    const paymentIntentId = charge?.payment_intent;
    if (typeof paymentIntentId === "string") {
      await adminClient
        .from("bookings")
        .update({ payment_status: "refunded" })
        .eq("payment_intent_id", paymentIntentId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
