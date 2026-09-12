import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL é obrigatória.');

const orgName = process.env.SEED_ORG_NAME || 'Empresa Demonstração';
const orgSlug = process.env.SEED_ORG_SLUG || 'demo';
const adminName = process.env.SEED_ADMIN_NAME || 'Administrador';
const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@demo.local').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || 'TroqueEstaSenha123!';

function hashPassword(value) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

const client = new Client({ connectionString });
await client.connect();
try {
  await client.query('BEGIN');
  const org = await client.query(`
    INSERT INTO organizations(name, slug, trial_ends_at)
    VALUES ($1, $2, now() + interval '30 days')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `, [orgName, orgSlug]);

  const user = await client.query(`
    INSERT INTO users(name, email, password_hash) VALUES ($1, $2, $3)
    ON CONFLICT (lower(email)) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `, [adminName, adminEmail, hashPassword(password)]);

  await client.query(`
    INSERT INTO memberships(organization_id, user_id, role)
    VALUES ($1, $2, 'OWNER')
    ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'OWNER', is_active = true
  `, [org.rows[0].id, user.rows[0].id]);

  await client.query(`
    INSERT INTO customers(organization_id, name, email, phone, city, state)
    SELECT $1, 'Cliente Demonstração', 'cliente@demo.local', '(51) 99999-0000', 'Porto Alegre', 'RS'
    WHERE NOT EXISTS (
      SELECT 1 FROM customers WHERE organization_id=$1 AND email='cliente@demo.local'
    )
  `, [org.rows[0].id]);

  await client.query(`
    INSERT INTO service_catalog(organization_id, name, sku, unit, default_price)
    VALUES ($1, 'Visita técnica', 'VISITA', 'UN', 150), ($1, 'Hora técnica', 'HORA', 'H', 120)
    ON CONFLICT (organization_id, sku) DO NOTHING
  `, [org.rows[0].id]);

  await client.query('COMMIT');
  console.log(`Seed concluído. Login: ${adminEmail}`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
