import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { query } from '@/lib/db';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export async function createPortalToken(input: {
  organizationId: string;
  customerId: string;
  createdBy: string;
  label?: string;
  expiresInDays?: number;
}) {
  const raw = randomBytes(32).toString('base64url');
  const days = Math.min(365, Math.max(1, input.expiresInDays ?? 30));
  await query(`
    INSERT INTO customer_portal_tokens(
      organization_id, customer_id, token_hash, label, expires_at, created_by
    ) VALUES ($1,$2,$3,$4,now() + ($5 || ' days')::interval,$6)
  `, [input.organizationId, input.customerId, sha256(raw), input.label || 'Portal do cliente', days, input.createdBy]);
  return raw;
}

export async function resolvePortalToken(raw: string) {
  if (!raw || raw.length < 20 || raw.length > 256) return null;
  const result = await query<{
    token_id:string; organization_id:string; customer_id:string; customer_name:string; organization_name:string;
  }>(`
    SELECT t.id token_id, t.organization_id, t.customer_id,
           c.name customer_name, o.name organization_name
    FROM customer_portal_tokens t
    JOIN customers c ON c.id=t.customer_id AND c.organization_id=t.organization_id
    JOIN organizations o ON o.id=t.organization_id AND o.status='ACTIVE'
    WHERE t.token_hash=$1
      AND t.revoked_at IS NULL
      AND (t.expires_at IS NULL OR t.expires_at > now())
      AND c.status='ACTIVE'
    LIMIT 1
  `, [sha256(raw)]);
  const row = result.rows[0];
  if (!row) return null;
  await query('UPDATE customer_portal_tokens SET last_used_at=now() WHERE id=$1', [row.token_id]);
  return row;
}
