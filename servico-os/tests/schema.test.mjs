import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../db/migrations/001_initial.sql', import.meta.url), 'utf8');
const required = ['organizations','users','memberships','sessions','customers','quotes','quote_items','work_orders','work_order_events','payments','fiscal_documents','integrations','api_keys','outbox_events','audit_logs'];

test('schema contém as entidades críticas', () => {
  for (const table of required) assert.match(sql, new RegExp(`CREATE TABLE ${table}\\b`));
});

test('entidades de negócio são tenant-aware', () => {
  for (const table of ['customers','quotes','work_orders','payments','fiscal_documents']) {
    const start = sql.indexOf(`CREATE TABLE ${table}`);
    const end = sql.indexOf(';', start);
    assert.ok(sql.slice(start,end).includes('organization_id uuid NOT NULL'));
  }
});
