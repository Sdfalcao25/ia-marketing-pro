import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { storePrivateFile } from '@/lib/storage';

const entityMap:Record<string,{table:string}>={WORK_ORDER:{table:'work_orders'},CUSTOMER:{table:'customers'},QUOTE:{table:'quotes'},FISCAL:{table:'fiscal_documents'},CHECKLIST:{table:'work_order_checklist_items'}};

export async function POST(request:Request) {
  const session=await getCurrentSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  const form=await request.formData();
  const file=form.get('file'); const entityType=String(form.get('entity_type')||'').toUpperCase(); const entityId=String(form.get('entity_id')||'');
  if (!(file instanceof File) || !entityMap[entityType] || !entityId) return NextResponse.json({error:'validation'},{status:422});
  const table=entityMap[entityType].table;
  const exists=await query(`SELECT 1 FROM ${table} WHERE id=$1 AND organization_id=$2`,[entityId,session.organization_id]);
  if (!exists.rowCount) return NextResponse.json({error:'entity_not_found'},{status:404});
  try {
    const stored=await storePrivateFile({organizationId:session.organization_id,uploadedBy:session.user_id,entityType,entityId,file});
    await query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'FILE_UPLOADED',$3,$4,$5::jsonb)`,[session.organization_id,session.user_id,entityType,entityId,JSON.stringify({attachmentId:stored.attachmentId,sha256:stored.sha256})]);
    return NextResponse.json(stored,{status:201});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:422}); }
}
