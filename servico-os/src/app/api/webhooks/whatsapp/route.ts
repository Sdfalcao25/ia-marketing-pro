import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request:Request) {
  const url=new URL(request.url);
  if (url.searchParams.get('hub.mode')==='subscribe' && url.searchParams.get('hub.verify_token')===process.env.WHATSAPP_VERIFY_TOKEN) return new Response(url.searchParams.get('hub.challenge')||'',{status:200});
  return new Response('Forbidden',{status:403});
}

export async function POST(request:Request) {
  const payload=await request.json().catch(()=>({})) as any;
  const externalEventId=payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id || `${Date.now()}-${Math.random()}`;
  const phoneNumberId=payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  const org=phoneNumberId ? (await query<{organization_id:string}>(`SELECT organization_id FROM integrations WHERE kind='WHATSAPP' AND provider='META' AND config->>'phone_number_id'=$1 AND status='ACTIVE' LIMIT 1`,[phoneNumberId])).rows[0] : null;
  await query(`INSERT INTO integration_webhook_events(provider,external_event_id,event_type,organization_id,payload,status,processed_at) VALUES('WHATSAPP',$1,'WEBHOOK',$2,$3::jsonb,'PROCESSED',now()) ON CONFLICT(provider,external_event_id) DO NOTHING`,[externalEventId,org?.organization_id||null,JSON.stringify(payload)]);
  return NextResponse.json({received:true});
}
