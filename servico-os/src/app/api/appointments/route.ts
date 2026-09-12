import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { readRequestData, redirectBack } from '@/lib/request';

const allowedRoles = new Set(['OWNER','ADMIN','MANAGER','TECHNICIAN']);

export async function GET() {
  const session=await getCurrentSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  const result=await query(`SELECT a.*,c.name customer_name,u.name assigned_name FROM appointments a LEFT JOIN customers c ON c.id=a.customer_id LEFT JOIN users u ON u.id=a.assigned_to WHERE a.organization_id=$1 ORDER BY a.starts_at ASC LIMIT 300`,[session.organization_id]);
  return NextResponse.json({data:result.rows});
}

export async function POST(request:Request) {
  const session=await getCurrentSession();
  if (!session) return NextResponse.json({error:'unauthorized'},{status:401});
  if (!allowedRoles.has(session.role)) return NextResponse.json({error:'forbidden'},{status:403});
  const d=await readRequestData(request);
  const title=String(d.title||'').trim();
  const startsAt=new Date(String(d.starts_at||''));
  const endsAt=new Date(String(d.ends_at||''));
  const customerId=String(d.customer_id||'')||null;
  const workOrderId=String(d.work_order_id||'')||null;
  const assignedTo=String(d.assigned_to||'')||null;
  if (!title || Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf()) || endsAt<=startsAt) return NextResponse.json({error:'validation'},{status:422});

  const appointment=await withTransaction(async(client)=>{
    let customer:{id:string;name:string;email:string|null;phone:string|null}|undefined;
    if (customerId) customer=(await client.query(`SELECT id,name,email,phone FROM customers WHERE id=$1 AND organization_id=$2`,[customerId,session.organization_id])).rows[0];
    if (!customer && workOrderId) customer=(await client.query(`SELECT c.id,c.name,c.email,c.phone FROM work_orders w JOIN customers c ON c.id=w.customer_id WHERE w.id=$1 AND w.organization_id=$2`,[workOrderId,session.organization_id])).rows[0];
    if (!customer) throw new Error('Cliente não encontrado.');
    const created=await client.query<{id:string}>(`INSERT INTO appointments(organization_id,work_order_id,customer_id,assigned_to,title,starts_at,ends_at,location,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,[session.organization_id,workOrderId,customer.id,assignedTo,title,startsAt.toISOString(),endsAt.toISOString(),String(d.location||'')||null,String(d.notes||'')||null,session.user_id]);
    if (workOrderId) await client.query(`UPDATE work_orders SET scheduled_start=$3,scheduled_end=$4,status=CASE WHEN status='OPEN' THEN 'SCHEDULED' ELSE status END,assigned_to=COALESCE($5,assigned_to),updated_at=now() WHERE id=$1 AND organization_id=$2`,[workOrderId,session.organization_id,startsAt.toISOString(),endsAt.toISOString(),assignedTo]);
    const payload={appointment_id:created.rows[0].id,customer_id:customer.id,customer_name:customer.name,email:customer.email,phone:customer.phone,work_order_id:workOrderId,title,starts_at:startsAt.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})};
    await client.query(`INSERT INTO outbox_events(organization_id,event_type,aggregate_type,aggregate_id,payload) VALUES($1,'APPOINTMENT_CREATED','APPOINTMENT',$2,$3::jsonb)`,[session.organization_id,created.rows[0].id,JSON.stringify(payload)]);
    await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id) VALUES($1,$2,'APPOINTMENT_CREATED','APPOINTMENT',$3)`,[session.organization_id,session.user_id,created.rows[0].id]);
    return created.rows[0];
  });
  if ((request.headers.get('content-type')||'').includes('application/json')) return NextResponse.json(appointment,{status:201});
  return NextResponse.redirect(redirectBack(request,'/app/agenda'),303);
}
