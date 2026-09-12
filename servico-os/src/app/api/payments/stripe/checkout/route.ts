import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { createPaymentCheckout } from '@/lib/stripe';
import { readRequestData } from '@/lib/request';

export async function POST(request:Request) {
  const session=await getCurrentSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!['OWNER','ADMIN','MANAGER','FINANCE'].includes(session.role)) return NextResponse.json({error:'forbidden'},{status:403});
  const d=await readRequestData(request); const paymentId=String(d.payment_id||'');
  const result=await query<{id:string;amount:number;number:number|null;email:string|null;name:string;work_order_id:string|null}>(`SELECT p.id,p.amount,w.number,c.email,c.name,p.work_order_id FROM payments p JOIN customers c ON c.id=p.customer_id LEFT JOIN work_orders w ON w.id=p.work_order_id WHERE p.id=$1 AND p.organization_id=$2 AND p.status IN ('PENDING','OVERDUE') LIMIT 1`,[paymentId,session.organization_id]);
  const payment=result.rows[0]; if (!payment) return NextResponse.json({error:'payment_not_found'},{status:404});
  try {
    const base=(process.env.APP_URL || new URL(request.url).origin).replace(/\/$/,'');
    const checkout=await createPaymentCheckout({paymentId:payment.id,amount:Number(payment.amount),customerEmail:payment.email,description:payment.number?`ServiçoOS — OS #${payment.number}`:`ServiçoOS — ${payment.name}`,appUrl:base});
    await query(`UPDATE payments SET provider='STRIPE',checkout_session_id=$3,payment_url=$4,updated_at=now() WHERE id=$1 AND organization_id=$2`,[payment.id,session.organization_id,checkout.id,checkout.url]);
    if ((request.headers.get('content-type')||'').includes('application/json')) return NextResponse.json({url:checkout.url,id:checkout.id});
    return NextResponse.redirect(checkout.url,303);
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:503}); }
}
