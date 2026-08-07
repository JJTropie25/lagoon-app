import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripeApiVersion = "2023-10-16";

async function stripePost(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": stripeApiVersion,
    },
    body: new URLSearchParams(params).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`stripe_error:${res.status}:${text}`);
  return JSON.parse(text);
}

serve(async (req) => {
  try {
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response("Missing Supabase secrets", { status: 500 });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: authData } = await userClient.auth.getUser();
    const user = authData?.user;
    if (!user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => ({}));
    const bookingId = body?.booking_id as string | undefined;
    const cancelledStatus = body?.status as
      | "cancelled_by_guest"
      | "cancelled_by_host"
      | undefined;
    const reason = body?.reason as string | undefined;

    if (!bookingId || !cancelledStatus) {
      return new Response("Missing booking_id or status", { status: 400 });
    }

    const { data: booking } = await adminClient
      .from("bookings")
      .select("id, guest_id, payment_intent_id, status, service:services(host_id)")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) return new Response("Booking not found", { status: 404 });

    // Must not already be cancelled or completed
    if (booking.status === "cancelled_by_guest" || booking.status === "cancelled_by_host") {
      return new Response("Booking already cancelled", { status: 409 });
    }

    // Authorization: caller is the guest OR a host that owns the service
    const isGuest = booking.guest_id === user.id;
    let isHost = false;
    if (!isGuest) {
      const svc = Array.isArray(booking.service) ? booking.service[0] : booking.service as any;
      if (svc?.host_id) {
        const { data: host } = await adminClient
          .from("hosts")
          .select("guest_id")
          .eq("id", svc.host_id)
          .maybeSingle();
        isHost = host?.guest_id === user.id;
      }
    }
    if (!isGuest && !isHost) return new Response("Forbidden", { status: 403 });

    // Update booking status
    const updateData: Record<string, string> = { status: cancelledStatus };
    if (reason) updateData.cancellation_reason = reason;
    await adminClient.from("bookings").update(updateData).eq("id", bookingId);

    // Stripe refund — reverse transfer + refund platform fee for full refund
    let refundId: string | null = null;
    if (booking.payment_intent_id && stripeSecretKey) {
      try {
        const refund = await stripePost("refunds", {
          payment_intent: booking.payment_intent_id,
          reverse_transfer: "true",
          refund_application_fee: "true",
        });
        refundId = refund.id;
      } catch (stripeErr) {
        console.error("Stripe refund failed:", stripeErr);
        // Booking is already cancelled — return partial success
        return new Response(
          JSON.stringify({ success: true, refund: null, stripe_error: String(stripeErr) }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, refund: refundId }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("refund-booking error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
