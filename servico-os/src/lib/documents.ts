import type { PoolClient } from 'pg';

export async function nextDocumentNumber(client: PoolClient, organizationId: string, kind: 'QUOTE' | 'WORK_ORDER') {
  const result = await client.query<{ current_value: string }>(`
    INSERT INTO document_counters(organization_id, kind, current_value)
    VALUES ($1, $2, 1)
    ON CONFLICT (organization_id, kind)
    DO UPDATE SET current_value = document_counters.current_value + 1
    RETURNING current_value
  `, [organizationId, kind]);
  return Number(result.rows[0].current_value);
}
