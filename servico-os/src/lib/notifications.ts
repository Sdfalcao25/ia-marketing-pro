import 'server-only';
import { query } from '@/lib/db';

type DeliveryResult = { ok:boolean; externalId?:string; skipped?:string };

async function log(input: { organizationId:string; customerId?:string|null; workOrderId?:string|null; channel:'EMAIL'|'WHATSAPP'|'SMS'|'SYSTEM'; provider:string; recipient?:string|null; subject?:string|null; preview?:string|null; externalId?:string|null; status:string; metadata?:Record<string,unknown> }) {
  await query(`INSERT INTO communication_log(organization_id,customer_id,work_order_id,channel,provider,recipient,subject,body_preview,external_id,status,metadata,sent_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,CASE WHEN $10='SENT' THEN now() ELSE NULL END)`,
    [input.organizationId,input.customerId||null,input.workOrderId||null,input.channel,input.provider,input.recipient||null,input.subject||null,input.preview||null,input.externalId||null,input.status,JSON.stringify(input.metadata||{})]);
}

export async function sendTransactionalEmail(input: {organizationId:string; customerId?:string|null; workOrderId?:string|null; to:string; subject:string; text:string; html?:string}) : Promise<DeliveryResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    await log({...input,channel:'EMAIL',provider:'RESEND',recipient:input.to,preview:input.text.slice(0,240),status:'SKIPPED',metadata:{reason:'missing_configuration'}});
    return {ok:false, skipped:'missing_configuration'};
  }
  const response = await fetch('https://api.resend.com/emails', {
    method:'POST', headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({from,to:[input.to],subject:input.subject,text:input.text,html:input.html})
  });
  const data = await response.json().catch(()=>({})) as {id?:string;message?:string};
  if (!response.ok) {
    await log({...input,channel:'EMAIL',provider:'RESEND',recipient:input.to,preview:input.text.slice(0,240),status:'FAILED',metadata:{httpStatus:response.status,error:data.message}});
    throw new Error(`Resend: ${data.message || response.status}`);
  }
  await log({...input,channel:'EMAIL',provider:'RESEND',recipient:input.to,preview:input.text.slice(0,240),externalId:data.id,status:'SENT'});
  return {ok:true, externalId:data.id};
}

export async function sendWhatsAppText(input: {organizationId:string; customerId?:string|null; workOrderId?:string|null; to:string; text:string}) : Promise<DeliveryResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.META_GRAPH_VERSION || 'v23.0';
  if (!token || !phoneId) {
    await log({...input,channel:'WHATSAPP',provider:'META',recipient:input.to,preview:input.text.slice(0,240),status:'SKIPPED',metadata:{reason:'missing_configuration'}});
    return {ok:false, skipped:'missing_configuration'};
  }
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to:input.to.replace(/\D/g,''),type:'text',text:{preview_url:false,body:input.text}})
  });
  const data = await response.json().catch(()=>({})) as {messages?:Array<{id:string}>;error?:{message?:string}};
  if (!response.ok) {
    await log({...input,channel:'WHATSAPP',provider:'META',recipient:input.to,preview:input.text.slice(0,240),status:'FAILED',metadata:{httpStatus:response.status,error:data.error?.message}});
    throw new Error(`WhatsApp: ${data.error?.message || response.status}`);
  }
  const externalId = data.messages?.[0]?.id;
  await log({...input,channel:'WHATSAPP',provider:'META',recipient:input.to,preview:input.text.slice(0,240),externalId,status:'SENT'});
  return {ok:true, externalId};
}
