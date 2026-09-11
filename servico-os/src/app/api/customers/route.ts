import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { customerSchema } from '@/lib/validation';
import { readRequestData, redirectBack } from '@/lib/request';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error:'unauthorized' }, { status:401 });
  const result = await query(`SELECT id,name,type,document,email,phone,status,created_at FROM customers WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 200`, [session.organization_id]);
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error:'unauthorized' }, { status:401 });
  const parsed = customerSchema.safeParse(await readRequestData(request));
  if (!parsed.success) return NextResponse.json({ error:'validation', details:parsed.error.flatten() }, { status:422 });
  const d = parsed.data;
  const result = await query<{id:string}>(`INSERT INTO customers(organization_id,type,name,document,email,phone) VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),NULLIF($6,'')) RETURNING id`, [session.organization_id,d.type,d.name,d.document||'',d.email||'',d.phone||'']);
  await query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id) VALUES ($1,$2,'CUSTOMER_CREATED','CUSTOMER',$3)`, [session.organization_id,session.user_id,result.rows[0].id]);
  if ((request.headers.get('content-type')||'').includes('application/json')) return NextResponse.json({ id:result.rows[0].id }, { status:201 });
  return NextResponse.redirect(redirectBack(request,'/app/clientes'),303);
}
