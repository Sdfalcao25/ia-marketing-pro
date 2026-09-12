import 'server-only';
import { query } from '@/lib/db';
import { sendTransactionalEmail, sendWhatsAppText } from '@/lib/notifications';
import { issueNfseDpsXml } from '@/lib/nfse';

export async function processOutbox(limit=25) {
  const rows = (await query<{id:string;organization_id:string;event_type:string;aggregate_id:string;payload:any;attempts:number}>(`
    SELECT id,organization_id,event_type,aggregate_id,payload,attempts
    FROM outbox_events
    WHERE processed_at IS NULL AND available_at <= now()
    ORDER BY created_at ASC LIMIT $1
  `,[limit])).rows;
  let processed=0, failed=0;
  for (const event of rows) {
    try {
      if (event.event_type === 'APPOINTMENT_CREATED') {
        const p = event.payload || {};
        const message = `Olá ${p.customer_name || ''}. Seu atendimento ${p.title || ''} está agendado para ${p.starts_at || ''}.`;
        if (p.email) await sendTransactionalEmail({organizationId:event.organization_id,customerId:p.customer_id,workOrderId:p.work_order_id,to:p.email,subject:'Atendimento agendado — ServiçoOS',text:message});
        if (p.phone) await sendWhatsAppText({organizationId:event.organization_id,customerId:p.customer_id,workOrderId:p.work_order_id,to:p.phone,text:message});
      }
      await query('UPDATE outbox_events SET processed_at=now(),last_error=NULL WHERE id=$1',[event.id]);
      processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await query(`UPDATE outbox_events SET attempts=attempts+1,last_error=$2,available_at=now() + (LEAST(attempts+1,6) || ' minutes')::interval WHERE id=$1`,[event.id,message.slice(0,1000)]);
      failed++;
    }
  }
  return {processed,failed,total:rows.length};
}

export async function processNfseJobs(limit=10) {
  const rows=(await query<{id:string;organization_id:string;fiscal_document_id:string;dps_xml:string|null;attempts:number}>(`
    SELECT id,organization_id,fiscal_document_id,dps_xml,attempts FROM nfse_jobs
    WHERE status IN ('PENDING','FAILED') AND next_attempt_at<=now()
    ORDER BY created_at ASC LIMIT $1
  `,[limit])).rows;
  let processed=0,failed=0;
  for (const job of rows) {
    try {
      if (!job.dps_xml) throw new Error('Job sem DPS XML.');
      await query(`UPDATE nfse_jobs SET status='PROCESSING',attempts=attempts+1,updated_at=now() WHERE id=$1`,[job.id]);
      const response=await issueNfseDpsXml(job.dps_xml);
      await query(`UPDATE nfse_jobs SET status='SUCCEEDED',response_xml=$2,last_error=NULL,updated_at=now() WHERE id=$1`,[job.id,response]);
      await query(`UPDATE fiscal_documents SET status='PROCESSING',provider='NFSE_NACIONAL',updated_at=now() WHERE id=$1`,[job.fiscal_document_id]);
      processed++;
    } catch (error) {
      const message=error instanceof Error?error.message:String(error);
      await query(`UPDATE nfse_jobs SET status='FAILED',last_error=$2,next_attempt_at=now() + (LEAST(attempts+1,6) || ' minutes')::interval,updated_at=now() WHERE id=$1`,[job.id,message.slice(0,2000)]);
      failed++;
    }
  }
  return {processed,failed,total:rows.length};
}
