import { randomBytes, scryptSync } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;
const [,, orgSlug, name, emailArg, password] = process.argv;
if (!orgSlug || !name || !emailArg || !password) {
  console.error('Uso: npm run db:create-admin -- <org-slug> "Nome" email@dominio.com "SenhaForte"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL é obrigatória.');

const salt = randomBytes(16).toString('hex');
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const org = await client.query('SELECT id FROM organizations WHERE slug=$1', [orgSlug]);
  if (!org.rowCount) throw new Error('Organização não encontrada.');
  await client.query('BEGIN');
  const user = await client.query(`INSERT INTO users(name,email,password_hash) VALUES ($1,$2,$3) RETURNING id`, [name, emailArg.toLowerCase(), passwordHash]);
  await client.query(`INSERT INTO memberships(organization_id,user_id,role) VALUES ($1,$2,'ADMIN')`, [org.rows[0].id, user.rows[0].id]);
  await client.query('COMMIT');
  console.log('Administrador criado.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
