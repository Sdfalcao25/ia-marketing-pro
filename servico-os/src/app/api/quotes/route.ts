import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { nextDocumentNumber } from '@/lib/documents';
import { quoteSchema } from '@/lib/validation';
import { readRequestData, redirectBack } from '@/lib/request';

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error:'unauthorized' }, { status:401 });
  if (!['OWNER','ADMIN','MANAGER'].includes(session.role)) return NextResponse.json({ error:'forbidden' }, { status:403 });
  const parsed = quoteSchema.safeParse(await readRequestData(request));
  if (!parsed.success) return NextResponse.json({ error:'validation', details:parsed.error.flatten() }, { status:422 });
  const d = parsed.data;
  const total = Math.round(d.quantity * d.unitPrice * 100) / 100;
  const id = await withTransaction(async (client) => {
    const customer = await client.query('SELECT id FROM customers WHERE id=$1 AND organization_id=$2', [d.customerId,session.organization_id]);
    if (!customer.rowCount) throw new Error('Cliente inválido.');
    const number = await nextDocumentNumber(client,session.organization_id,'QUOTE');
    const quote = await client.query<{id:string}>(`INSERT INTO quotes(organization_id,customer_id,number,valid_until,subtotal,total,notes,created_by) VALUES ($1,$2,$3,NULLIF($4,'')::date,$5,$5,NULLIF($6,''),$7) RETURNING id`, [session.organization_id,d.customerId,number,d.validUntil||'',total,d.notes||'',session.user_id]);
    await client.query(`INSERT INTO quote_items(organization_id,quote_id,description,quantity,unit_price,total) VALUES ($1,$2,$3,$4,$5,$6)`, [session.organization_id,quote.rows[0].id,d.description,d.quantity,d.unitPrice,total]);
    await client.query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id) VALUES ($1,$2,'QUOTE_CREATED','QUOTE',$3)`, [session.organization_id,session.user_id,quote.rows[0].id]);
    return quote.rows[0].id;
  });
  if ((request.headers.get('content-type')||'').includes('application/json')) return NextResponse.json({ id }, { status:201 });
  return NextResponse.redirect(redirectBack(request,'/app/orcamentos'),303);
}
