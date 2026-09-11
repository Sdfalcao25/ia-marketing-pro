import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { redirectBack } from '@/lib/request';
import { withTransaction } from '@/lib/db';

const transitions:Record<string,string[]>={DRAFT:['SENT','CANCELLED'],SENT:['APPROVED','REJECTED','EXPIRED','CANCELLED'],APPROVED:['CANCELLED'],REJECTED:[],EXPIRED:[],CANCELLED:[]};

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const s=await getCurrentSession();if(!s)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!['OWNER','ADMIN','MANAGER'].includes(s.role))return NextResponse.json({error:'forbidden'},{status:403});
  const {id}=await params;const form=await request.formData();const next=String(form.get('status')||'');
  await withTransaction(async client=>{
    const current=await client.query<{status:string}>('SELECT status::text FROM quotes WHERE id=$1 AND organization_id=$2 FOR UPDATE',[id,s.organization_id]);if(!current.rowCount)throw new Error('Orçamento não encontrado.');
    const from=current.rows[0].status;if(!(transitions[from]||[]).includes(next))throw new Error(`Transição inválida: ${from} -> ${next}`);
    await client.query('UPDATE quotes SET status=$1::quote_status,updated_at=now() WHERE id=$2 AND organization_id=$3',[next,id,s.organization_id]);
    await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,'QUOTE_STATUS_CHANGED','QUOTE',$3,jsonb_build_object('from',$4,'to',$5))`,[s.organization_id,s.user_id,id,from,next]);
    await client.query(`INSERT INTO outbox_events(organization_id,event_type,aggregate_type,aggregate_id,payload) VALUES ($1,'quote.status_changed','QUOTE',$2,jsonb_build_object('from',$3,'to',$4))`,[s.organization_id,id,from,next]);
  });
  return NextResponse.redirect(redirectBack(request,'/app/orcamentos'),303);
}
