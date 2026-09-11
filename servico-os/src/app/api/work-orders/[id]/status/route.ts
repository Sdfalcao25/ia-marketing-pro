import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { redirectBack } from '@/lib/request';
import { withTransaction } from '@/lib/db';

const transitions:Record<string,string[]>= {OPEN:['SCHEDULED','IN_PROGRESS','CANCELLED'],SCHEDULED:['IN_PROGRESS','CANCELLED'],IN_PROGRESS:['PAUSED','COMPLETED','CANCELLED'],PAUSED:['IN_PROGRESS','CANCELLED'],COMPLETED:[],CANCELLED:[]};

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const s=await getCurrentSession();if(!s)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!['OWNER','ADMIN','MANAGER','TECHNICIAN'].includes(s.role))return NextResponse.json({error:'forbidden'},{status:403});
  const {id}=await params;const form=await request.formData();const next=String(form.get('status')||'');
  await withTransaction(async client=>{
    const current=await client.query<{status:string}>('SELECT status::text FROM work_orders WHERE id=$1 AND organization_id=$2 FOR UPDATE',[id,s.organization_id]);
    if(!current.rowCount)throw new Error('OS não encontrada.');
    const from=current.rows[0].status;if(!(transitions[from]||[]).includes(next))throw new Error(`Transição inválida: ${from} -> ${next}`);
    await client.query(`UPDATE work_orders SET status=$1::work_order_status,started_at=CASE WHEN $1='IN_PROGRESS' AND started_at IS NULL THEN now() ELSE started_at END,completed_at=CASE WHEN $1='COMPLETED' THEN now() ELSE completed_at END,updated_at=now() WHERE id=$2 AND organization_id=$3`,[next,id,s.organization_id]);
    await client.query(`INSERT INTO work_order_events(organization_id,work_order_id,event_type,from_status,to_status,created_by) VALUES ($1,$2,'STATUS_CHANGED',$3::work_order_status,$4::work_order_status,$5)`,[s.organization_id,id,from,next,s.user_id]);
    await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,'WORK_ORDER_STATUS_CHANGED','WORK_ORDER',$3,jsonb_build_object('from',$4,'to',$5))`,[s.organization_id,s.user_id,id,from,next]);
    await client.query(`INSERT INTO outbox_events(organization_id,event_type,aggregate_type,aggregate_id,payload) VALUES ($1,'work_order.status_changed','WORK_ORDER',$2,jsonb_build_object('from',$3,'to',$4))`,[s.organization_id,id,from,next]);
  });
  return NextResponse.redirect(redirectBack(request,'/app/os'),303);
}
