import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { nextDocumentNumber } from '@/lib/documents';
import { workOrderSchema } from '@/lib/validation';
import { readRequestData, redirectBack } from '@/lib/request';

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error:'unauthorized' }, { status:401 });
  if (!['OWNER','ADMIN','MANAGER','TECHNICIAN'].includes(session.role)) return NextResponse.json({ error:'forbidden' }, { status:403 });
  const parsed = workOrderSchema.safeParse(await readRequestData(request));
  if (!parsed.success) return NextResponse.json({ error:'validation', details:parsed.error.flatten() }, { status:422 });
  const d = parsed.data;
  const id = await withTransaction(async (client) => {
    const customer = await client.query('SELECT id FROM customers WHERE id=$1 AND organization_id=$2', [d.customerId,session.organization_id]);
    if (!customer.rowCount) throw new Error('Cliente inválido.');
    const number = await nextDocumentNumber(client,session.organization_id,'WORK_ORDER');
    const os = await client.query<{id:string}>(`INSERT INTO work_orders(organization_id,customer_id,number,title,description,priority,scheduled_start,amount,created_by) VALUES ($1,$2,$3,$4,NULLIF($5,''),$6,NULLIF($7,'')::timestamptz,$8,$9) RETURNING id`, [session.organization_id,d.customerId,number,d.title,d.description||'',d.priority,d.scheduledStart||'',d.amount,session.user_id]);
    await client.query(`INSERT INTO work_order_events(organization_id,work_order_id,event_type,to_status,created_by) VALUES ($1,$2,'CREATED','OPEN',$3)`, [session.organization_id,os.rows[0].id,session.user_id]);
    await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id) VALUES ($1,$2,'WORK_ORDER_CREATED','WORK_ORDER',$3)`, [session.organization_id,session.user_id,os.rows[0].id]);
    return os.rows[0].id;
  });
  if ((request.headers.get('content-type')||'').includes('application/json')) return NextResponse.json({ id }, { status:201 });
  return NextResponse.redirect(redirectBack(request,'/app/os'),303);
}
