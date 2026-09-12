import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { query, withTransaction } from '@/lib/db';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','application/pdf']);

function cleanName(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'arquivo';
}

export async function storePrivateFile(input: {
  organizationId:string; uploadedBy:string; entityType:string; entityId:string; file:File;
}) {
  if (!ALLOWED.has(input.file.type)) throw new Error('Tipo de arquivo não permitido.');
  if (input.file.size <= 0 || input.file.size > MAX_BYTES) throw new Error('Arquivo deve ter até 8 MB.');
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const digest = createHash('sha256').update(buffer).digest('hex');
  const objectKey = `${input.organizationId}/${input.entityType.toLowerCase()}/${input.entityId}/${randomUUID()}-${cleanName(input.file.name)}`;

  return withTransaction(async (client) => {
    const media = await client.query<{id:string}>(`
      INSERT INTO media_objects(organization_id,object_key,file_name,mime_type,byte_size,content,sha256,uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
    `, [input.organizationId, objectKey, input.file.name, input.file.type, buffer.length, buffer, digest, input.uploadedBy]);
    const attachment = await client.query<{id:string}>(`
      INSERT INTO attachments(organization_id,entity_type,entity_id,file_name,mime_type,byte_size,storage_key,uploaded_by,media_object_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id
    `, [input.organizationId,input.entityType,input.entityId,input.file.name,input.file.type,buffer.length,objectKey,input.uploadedBy,media.rows[0].id]);
    return { mediaObjectId: media.rows[0].id, attachmentId: attachment.rows[0].id, objectKey, sha256: digest };
  });
}

export async function getPrivateFile(organizationId:string, mediaObjectId:string) {
  const result = await query<{file_name:string;mime_type:string;byte_size:number;content:Buffer;sha256:string}>(`
    SELECT file_name,mime_type,byte_size,content,sha256
    FROM media_objects WHERE organization_id=$1 AND id=$2 LIMIT 1
  `, [organizationId, mediaObjectId]);
  return result.rows[0] ?? null;
}
