import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { createPortalToken } from '@/lib/portal';
import { readRequestData } from '@/lib/request';

export async function POST(request:Request) {
  const session=await getCurrentSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!['OWNER','ADMIN','MANAGER'].includes(session.role)) return NextResponse.json({error:'forbidden'},{status:403});
  const d=await readRequestData(request);
  const customerId=String(d.customer_id||'');
  const exists=await query(`SELECT 1 FROM customers WHERE id=$1 AND organization_id=$2 AND status='ACTIVE'`,[customerId,session.organization_id]);
  if (!exists.rowCount) return NextResponse.json({error:'customer_not_found'},{status:404});
  const token=await createPortalToken({organizationId:session.organization_id,customerId,createdBy:session.user_id,expiresInDays:Number(d.expires_days||30)});
  const base=(process.env.APP_URL || new URL(request.url).origin).replace(/\/$/,'');
  const link=`${base}/portal/${token}`;
  await query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'PORTAL_LINK_CREATED','CUSTOMER',$3,$4::jsonb)`,[session.organization_id,session.user_id,customerId,JSON.stringify({expiresDays:Number(d.expires_days||30)})]);
  if ((request.headers.get('content-type')||'').includes('application/json')) return NextResponse.json({link},{status:201});
  return NextResponse.redirect(new URL(`/app/portal?link=${encodeURIComponent(link)}`,request.url),303);
}
