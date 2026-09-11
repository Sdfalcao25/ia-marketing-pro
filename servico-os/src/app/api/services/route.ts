import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { readRequestData, redirectBack } from '@/lib/request';

const schema=z.object({name:z.string().trim().min(2).max(160),sku:z.string().trim().max(60).optional().or(z.literal('')),unit:z.string().trim().min(1).max(20).default('UN'),defaultPrice:z.coerce.number().nonnegative().max(100000000),description:z.string().trim().max(1000).optional().or(z.literal(''))});

export async function POST(request:Request){
  const s=await getCurrentSession(); if(!s)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!['OWNER','ADMIN','MANAGER'].includes(s.role))return NextResponse.json({error:'forbidden'},{status:403});
  const parsed=schema.safeParse(await readRequestData(request)); if(!parsed.success)return NextResponse.json({error:'validation',details:parsed.error.flatten()},{status:422});
  const d=parsed.data;
  const result=await query<{id:string}>(`INSERT INTO service_catalog(organization_id,name,sku,unit,default_price,description) VALUES ($1,$2,NULLIF($3,''),$4,$5,NULLIF($6,'')) RETURNING id`,[s.organization_id,d.name,d.sku||'',d.unit,d.defaultPrice,d.description||'']);
  await query(`INSERT INTO audit_logs(organization_id,user_id,action,entity_type,entity_id) VALUES ($1,$2,'SERVICE_CREATED','SERVICE',$3)`,[s.organization_id,s.user_id,result.rows[0].id]);
  if((request.headers.get('content-type')||'').includes('application/json'))return NextResponse.json({id:result.rows[0].id},{status:201});
  return NextResponse.redirect(redirectBack(request,'/app/servicos'),303);
}
