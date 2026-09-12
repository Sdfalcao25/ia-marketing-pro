import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { readRequestData, redirectBack } from '@/lib/request';

export async function POST(request:Request) {
  const session=await getCurrentSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!['OWNER','ADMIN','MANAGER','TECHNICIAN'].includes(session.role)) return NextResponse.json({error:'forbidden'},{status:403});
  const d=await readRequestData(request);
  const action=String(d.action||'');

  if (action==='create_template') {
    const name=String(d.name||'').trim();
    const lines=String(d.items||'').split('\n').map((v)=>v.trim()).filter(Boolean).slice(0,100);
    if (!name || !lines.length) return NextResponse.json({error:'validation'},{status:422});
    await withTransaction(async(client)=>{
      const t=await client.query<{id:string}>(`INSERT INTO checklist_templates(organization_id,name,description,created_by) VALUES($1,$2,$3,$4) RETURNING id`,[session.organization_id,name,String(d.description||'')||null,session.user_id]);
      for (let i=0;i<lines.length;i++) await client.query(`INSERT INTO checklist_template_items(organization_id,template_id,label,item_type,required,sort_order) VALUES($1,$2,$3,'BOOLEAN',true,$4)`,[session.organization_id,t.rows[0].id,lines[i],i]);
      await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id) VALUES($1,$2,'CHECKLIST_TEMPLATE_CREATED','CHECKLIST_TEMPLATE',$3)`,[session.organization_id,session.user_id,t.rows[0].id]);
    });
  } else if (action==='apply_template') {
    const templateId=String(d.template_id||''); const workOrderId=String(d.work_order_id||'');
    if (!templateId || !workOrderId) return NextResponse.json({error:'validation'},{status:422});
    await withTransaction(async(client)=>{
      const wo=await client.query(`SELECT 1 FROM work_orders WHERE id=$1 AND organization_id=$2`,[workOrderId,session.organization_id]);
      if (!wo.rowCount) throw new Error('OS não encontrada.');
      const existing=await client.query(`SELECT 1 FROM work_order_checklist_items WHERE work_order_id=$1 AND organization_id=$2 LIMIT 1`,[workOrderId,session.organization_id]);
      if (existing.rowCount) throw new Error('Esta OS já possui checklist.');
      const inserted=await client.query(`INSERT INTO work_order_checklist_items(organization_id,work_order_id,source_template_item_id,label,item_type,required,sort_order)
        SELECT organization_id,$1,id,label,item_type,required,sort_order FROM checklist_template_items WHERE template_id=$2 AND organization_id=$3 ORDER BY sort_order RETURNING id`,[workOrderId,templateId,session.organization_id]);
      if (!inserted.rowCount) throw new Error('Template vazio ou não encontrado.');
      await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'CHECKLIST_APPLIED','WORK_ORDER',$3,$4::jsonb)`,[session.organization_id,session.user_id,workOrderId,JSON.stringify({templateId})]);
    });
  } else if (action==='update_item') {
    const itemId=String(d.item_id||'');
    const completed=String(d.is_completed||'')==='true' || String(d.is_completed||'')==='on';
    const result=await query(`UPDATE work_order_checklist_items SET is_completed=$3,response_text=NULLIF($4,''),completed_by=CASE WHEN $3 THEN $5 ELSE NULL END,completed_at=CASE WHEN $3 THEN now() ELSE NULL END,updated_at=now() WHERE id=$1 AND organization_id=$2 RETURNING work_order_id`,[itemId,session.organization_id,completed,String(d.response_text||''),session.user_id]);
    if (!result.rowCount) return NextResponse.json({error:'not_found'},{status:404});
  } else return NextResponse.json({error:'invalid_action'},{status:400});

  if ((request.headers.get('content-type')||'').includes('application/json')) return NextResponse.json({ok:true});
  return NextResponse.redirect(redirectBack(request,'/app/checklists'),303);
}
