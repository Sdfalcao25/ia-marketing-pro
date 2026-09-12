import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { readRequestData, redirectBack } from '@/lib/request';

export async function POST(request:Request) {
  const session=await getCurrentSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!['OWNER','ADMIN','MANAGER','FINANCE'].includes(session.role)) return NextResponse.json({error:'forbidden'},{status:403});
  const d=await readRequestData(request); const fiscalId=String(d.fiscal_document_id||''); const dpsXml=String(d.dps_xml||'').trim();
  if (!fiscalId || !dpsXml.startsWith('<')) return NextResponse.json({error:'validation'},{status:422});
  const fiscal=await query(`SELECT 1 FROM fiscal_documents WHERE id=$1 AND organization_id=$2`,[fiscalId,session.organization_id]);
  if (!fiscal.rowCount) return NextResponse.json({error:'not_found'},{status:404});
  const created=await query<{id:string}>(`INSERT INTO nfse_jobs(organization_id,fiscal_document_id,environment,operation,dps_xml) VALUES($1,$2,$3,'ISSUE',$4) RETURNING id`,[session.organization_id,fiscalId,(process.env.NFSE_ENVIRONMENT||'HOMOLOGATION').toUpperCase(),dpsXml]);
  await query(`UPDATE fiscal_documents SET status='PROCESSING',provider='NFSE_NACIONAL',updated_at=now() WHERE id=$1`,[fiscalId]);
  if ((request.headers.get('content-type')||'').includes('application/json')) return NextResponse.json({id:created.rows[0].id},{status:202});
  return NextResponse.redirect(redirectBack(request,'/app/integracoes'),303);
}
