import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { createSubscriptionCheckout } from '@/lib/stripe';
import { readRequestData } from '@/lib/request';

const prices:Record<string,string|undefined>={STARTER:process.env.STRIPE_PRICE_STARTER,PRO:process.env.STRIPE_PRICE_PRO,BUSINESS:process.env.STRIPE_PRICE_BUSINESS};

export async function POST(request:Request) {
  const session=await getCurrentSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!['OWNER','ADMIN'].includes(session.role)) return NextResponse.json({error:'forbidden'},{status:403});
  const d=await readRequestData(request); const plan=String(d.plan||'').toUpperCase(); const priceId=prices[plan];
  if (!priceId) return NextResponse.json({error:'price_not_configured'},{status:503});
  const org=(await query<{stripe_customer_id:string|null;email:string|null}>(`SELECT stripe_customer_id,email FROM organizations WHERE id=$1`,[session.organization_id])).rows[0];
  const base=(process.env.APP_URL || new URL(request.url).origin).replace(/\/$/,'');
  try {
    const checkout=await createSubscriptionCheckout({organizationId:session.organization_id,priceId,appUrl:base,customerId:org?.stripe_customer_id,customerEmail:org?.email||session.email});
    return NextResponse.redirect(checkout.url,303);
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:503}); }
}
