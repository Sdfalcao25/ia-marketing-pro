import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolvePortalToken } from '@/lib/portal';
import { query } from '@/lib/db';

export async function POST(request:Request,{params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  const access=await resolvePortalToken(token);
  if (!access) return NextResponse.json({error:'invalid_portal'},{status:401});
  const body=await request.json().catch(()=>({})) as Record<string,unknown>;
  const workOrderId=String(body.workOrderId||'');
  const signerName=String(body.signerName||'').trim();
  const signerDocument=String(body.signerDocument||'').trim();
  const signatureData=String(body.signatureData||'');
  if (!signerName || !signatureData.startsWith('data:image/png;base64,') || signatureData.length>450000) return NextResponse.json({error:'validation'},{status:422});
  const wo=await query<{id:string}>(`SELECT id FROM work_orders WHERE id=$1 AND organization_id=$2 AND customer_id=$3 AND status IN ('IN_PROGRESS','COMPLETED')`,[workOrderId,access.organization_id,access.customer_id]);
  if (!wo.rowCount) return NextResponse.json({error:'work_order_not_signable'},{status:404});
  const existing=await query(`SELECT 1 FROM work_order_signatures WHERE work_order_id=$1 AND organization_id=$2 LIMIT 1`,[workOrderId,access.organization_id]);
  if (existing.rowCount) return NextResponse.json({error:'already_signed'},{status:409});
  const consent='Declaro que conferi o serviço executado e assino eletronicamente esta ordem de serviço.';
  const hash=createHash('sha256').update(signatureData).digest('hex');
  const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const created=await query<{id:string}>(`INSERT INTO work_order_signatures(organization_id,work_order_id,customer_id,signer_name,signer_document,signature_data,signature_sha256,consent_text,ip_address,user_agent) VALUES($1,$2,$3,$4,NULLIF($5,''),$6,$7,$8,$9,$10) RETURNING id`,[access.organization_id,workOrderId,access.customer_id,signerName,signerDocument,signatureData,hash,consent,forwarded,request.headers.get('user-agent')]);
  await query(`UPDATE work_orders SET customer_signature_key=$3,updated_at=now() WHERE id=$1 AND organization_id=$2`,[workOrderId,access.organization_id,created.rows[0].id]);
  await query(`INSERT INTO audit_logs(organization_id,action,entity_type,entity_id,metadata) VALUES($1,'WORK_ORDER_SIGNED','WORK_ORDER',$2,$3::jsonb)`,[access.organization_id,workOrderId,JSON.stringify({signerName,hash})]);
  return NextResponse.json({ok:true,signatureId:created.rows[0].id});
}
