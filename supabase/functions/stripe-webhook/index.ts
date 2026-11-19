// Webhook do Stripe: registra a compra da Mesa de Trabalho na tabela entitlements.
// Publicar:  supabase functions deploy stripe-webhook --no-verify-jwt
// Segredos:  supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=...
// No Stripe:  Developers > Webhooks > endpoint https://<projeto>.supabase.co/functions/v1/stripe-webhook
//             evento checkout.session.completed
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });
const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig ?? "", Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "", undefined, Stripe.createSubtleCryptoProvider());
  } catch (e) {
    return new Response("assinatura inválida: " + (e as Error).message, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const email = (s.customer_details?.email || s.customer_email || "").trim().toLowerCase();
    if (email && s.payment_status === "paid") {
      const { error } = await db.from("entitlements").upsert({ email, product: "mesa", source: "stripe", ref: s.id }, { onConflict: "email,product", ignoreDuplicates: true });
      if (error) return new Response(error.message, { status: 500 });
    }
  }
  return new Response("ok");
});
