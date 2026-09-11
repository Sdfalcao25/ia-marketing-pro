import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { readRequestData, redirectBack } from '@/lib/request';

const schema=z.object({customerId:z.string().uuid(),workOrderId:z.string().uuid().optional().or(z.literal('')),amount:z.coerce.number().positive().max(100000000),dueAt:z.string().optional().or(z.literal('')),method:z.string().trim().max(30).optional().or(z.literal(''))});

export async function POST(request:Request){
  const s=await getCurrentSession(); if(!s)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!['OWNER','ADMIN','MANAGER','FINANCE'].includes(s.role))return NextResponse.json({error:'forbidden'},{status:403});
  const parsed=schema.safeParse(await readRequestData(request)); if(!parsed.success)return NextResponse.json({error:'validation',details:parsed.error.flatten()},{status:422});
  const d=parsed.data;
  const customer=await query('SELECT id FROM customers WHERE id=$1 AND organization_id=$2',[d.customerId,s.organization_id]); if(!customer.rowCount)return NextResponse.json({error:'customer_not_found'},{status:404});
  if(d.workOrderId){const os=await query('SELECT id FROM work_orders WHERE id=$1 AND organization_id=$2',[d.workOrderId,s.organization_id]);if(!os.rowCount)return NextResponse.json({error:'work_order_not_found'},{status:404});}
  const result=await query<{id:string}>(`INSERT INTO payments(organization_id,customer_id,work_order_id,amount,due_at,method) VALUES ($1,$2,NULLIF($3,'')::uuid,$4,NULLIF($5,'')::timestamptz,NULLIF($6,'')) RETURNING id`,[s.organization_id,d.customerId,d.workOrderId||'',d.amount,d.dueAt||'',d.method||'']);
  await query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id) VALUES ($1,$2,'PAYMENT_CREATED','PAYMENT',$3)`,[s.organization_id,s.user_id,result.rows[0].id]);
  if((request.headers.get('content-type')||'').includes('application/json'))return NextResponse.json({id:result.rows[0].id},{status:201});
  return NextResponse.redirect(redirectBack(request,'/app/financeiro'),303);
}
