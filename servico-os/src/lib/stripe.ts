import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

function stripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY não configurada.');
  return key;
}

function append(params:URLSearchParams, key:string, value:unknown) {
  if (value === undefined || value === null || value === '') return;
  params.append(key, String(value));
}

export async function stripePost(path:string, fields:Record<string,unknown>) {
  const body = new URLSearchParams();
  for (const [key,value] of Object.entries(fields)) append(body,key,value);
  const response = await fetch(`https://api.stripe.com${path}`, {
    method:'POST', headers:{Authorization:`Bearer ${stripeKey()}`,'Content-Type':'application/x-www-form-urlencoded'}, body
  });
  const data = await response.json() as Record<string,any>;
  if (!response.ok) throw new Error(data?.error?.message || `Stripe HTTP ${response.status}`);
  return data;
}

export async function createPaymentCheckout(input:{paymentId:string; amount:number; customerEmail?:string|null; description:string; appUrl:string}) {
  const cents = Math.round(Number(input.amount) * 100);
  if (!Number.isFinite(cents) || cents < 50) throw new Error('Valor inválido para cobrança.');
  return stripePost('/v1/checkout/sessions', {
    mode:'payment',
    success_url:`${input.appUrl}/portal/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${input.appUrl}/portal/pagamento-cancelado`,
    client_reference_id:input.paymentId,
    customer_email:input.customerEmail || undefined,
    'payment_method_types[0]':'card',
    'payment_method_types[1]':'pix',
    'line_items[0][quantity]':1,
    'line_items[0][price_data][currency]':'brl',
    'line_items[0][price_data][unit_amount]':cents,
    'line_items[0][price_data][product_data][name]':input.description.slice(0,120),
    'metadata[payment_id]':input.paymentId,
    'payment_intent_data[metadata][payment_id]':input.paymentId
  });
}

export async function createSubscriptionCheckout(input:{organizationId:string;priceId:string;appUrl:string;customerId?:string|null;customerEmail?:string|null}) {
  return stripePost('/v1/checkout/sessions', {
    mode:'subscription',
    success_url:`${input.appUrl}/app/integracoes?billing=success`,
    cancel_url:`${input.appUrl}/app/integracoes?billing=cancelled`,
    customer:input.customerId || undefined,
    customer_email:input.customerId ? undefined : input.customerEmail || undefined,
    'line_items[0][quantity]':1,
    'line_items[0][price]':input.priceId,
    'metadata[organization_id]':input.organizationId,
    'subscription_data[metadata][organization_id]':input.organizationId
  });
}

export function verifyStripeSignature(payload:string, header:string|null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = header.split(',').map((p)=>p.trim().split('='));
  const timestamp = parts.find(([k])=>k==='t')?.[1];
  const signatures = parts.filter(([k])=>k==='v1').map(([,v])=>v);
  if (!timestamp || !signatures.length) return false;
  const age = Math.abs(Math.floor(Date.now()/1000)-Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  return signatures.some((sig)=>{
    const candidate = Buffer.from(sig);
    return candidate.length === expectedBuffer.length && timingSafeEqual(candidate, expectedBuffer);
  });
}
