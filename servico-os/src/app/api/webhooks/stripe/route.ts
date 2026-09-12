import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyStripeSignature } from '@/lib/stripe';

export async function POST(request:Request) {
  const payload=await request.text();
  if (!verifyStripeSignature(payload,request.headers.get('stripe-signature'))) return NextResponse.json({error:'invalid_signature'},{status:400});
  const event=JSON.parse(payload) as {id:string;type:string;data:{object:any}};
  const inserted=await query(`INSERT INTO integration_webhook_events(provider,external_event_id,event_type,payload) VALUES('STRIPE',$1,$2,$3::jsonb) ON CONFLICT(provider,external_event_id) DO NOTHING RETURNING id`,[event.id,event.type,payload]);
  if (!inserted.rowCount) return NextResponse.json({received:true,duplicate:true});
  try {
    const object=event.data.object;
    if (event.type==='checkout.session.completed' || event.type==='checkout.session.async_payment_succeeded') {
      const paymentId=object.metadata?.payment_id || object.client_reference_id;
      if (paymentId && object.payment_status==='paid') await query(`UPDATE payments SET status='PAID',paid_at=COALESCE(paid_at,now()),external_id=COALESCE(external_id,$2),updated_at=now() WHERE id=$1`,[paymentId,object.payment_intent||object.id]);
      const orgId=object.metadata?.organization_id;
      if (orgId && object.customer) await query(`UPDATE organizations SET stripe_customer_id=COALESCE(stripe_customer_id,$2),updated_at=now() WHERE id=$1`,[orgId,object.customer]);
    }
    if (event.type==='payment_intent.succeeded') {
      const paymentId=object.metadata?.payment_id;
      if (paymentId) await query(`UPDATE payments SET status='PAID',paid_at=COALESCE(paid_at,now()),provider_payment_intent_id=$2,external_id=COALESCE(external_id,$2),updated_at=now() WHERE id=$1`,[paymentId,object.id]);
    }
    if (event.type.startsWith('customer.subscription.')) {
      const orgId=object.metadata?.organization_id;
      if (orgId) {
        const status=String(object.status||'unknown').toUpperCase();
        await query(`INSERT INTO billing_subscriptions(organization_id,provider,external_customer_id,external_subscription_id,price_id,plan,status,current_period_start,current_period_end,cancel_at_period_end)
          VALUES($1,'STRIPE',$2,$3,$4,COALESCE((SELECT plan FROM organizations WHERE id=$1),'STARTER'),$5,to_timestamp($6),to_timestamp($7),$8)
          ON CONFLICT(organization_id,provider) DO UPDATE SET external_customer_id=EXCLUDED.external_customer_id,external_subscription_id=EXCLUDED.external_subscription_id,price_id=EXCLUDED.price_id,status=EXCLUDED.status,current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,cancel_at_period_end=EXCLUDED.cancel_at_period_end,updated_at=now()`,[orgId,object.customer,object.id,object.items?.data?.[0]?.price?.id,status,object.current_period_start||0,object.current_period_end||0,Boolean(object.cancel_at_period_end)]);
        const billingStatus=['ACTIVE','TRIALING'].includes(status)?'ACTIVE':status==='PAST_DUE'?'PAST_DUE':event.type==='customer.subscription.deleted'?'CANCELLED':'PENDING';
        await query(`UPDATE organizations SET billing_status=$2,stripe_customer_id=COALESCE(stripe_customer_id,$3),updated_at=now() WHERE id=$1`,[orgId,billingStatus,object.customer]);
      }
    }
    if (event.type==='invoice.payment_failed' || event.type==='invoice.paid') {
      const customer=object.customer;
      if (customer) await query(`UPDATE organizations SET billing_status=$2,updated_at=now() WHERE stripe_customer_id=$1`,[customer,event.type==='invoice.paid'?'ACTIVE':'PAST_DUE']);
    }
    await query(`UPDATE integration_webhook_events SET status='PROCESSED',processed_at=now() WHERE provider='STRIPE' AND external_event_id=$1`,[event.id]);
    return NextResponse.json({received:true});
  } catch(error) {
    await query(`UPDATE integration_webhook_events SET status='FAILED',error_message=$2 WHERE provider='STRIPE' AND external_event_id=$1`,[event.id,(error instanceof Error?error.message:String(error)).slice(0,2000)]);
    return NextResponse.json({error:'processing_failed'},{status:500});
  }
}
