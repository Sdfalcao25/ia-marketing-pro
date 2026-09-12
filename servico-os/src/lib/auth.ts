import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export const SESSION_COOKIE = 'servicoos_session';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expectedHex] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function authenticate(email: string, password: string) {
  const result = await query<{
    user_id: string; organization_id: string; name: string; email: string; role: string; password_hash: string;
  }>(`
    SELECT u.id user_id, m.organization_id, u.name, u.email, m.role::text, u.password_hash
    FROM users u
    JOIN memberships m ON m.user_id = u.id AND m.is_active = true
    JOIN organizations o ON o.id = m.organization_id AND o.status = 'ACTIVE'
    WHERE lower(u.email) = lower($1) AND u.status = 'ACTIVE'
    ORDER BY CASE m.role WHEN 'OWNER' THEN 1 WHEN 'ADMIN' THEN 2 ELSE 3 END
    LIMIT 1
  `, [email]);
  const row = result.rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  return row;
}

export async function createSession(userId: string, organizationId: string) {
  const token = randomBytes(32).toString('base64url');
  const days = Math.max(1, Number(process.env.SESSION_TTL_DAYS || 14));
  await query(`
    INSERT INTO sessions(user_id, organization_id, token_hash, expires_at)
    VALUES ($1,$2,$3, now() + ($4 || ' days')::interval)
  `, [userId, organizationId, tokenHash(token), days]);
  return { token, maxAge: days * 86400 };
}

export async function destroySession(token?: string) {
  if (!token) return;
  await query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash(token)]);
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const result = await query<{
    user_id: string; organization_id: string; name: string; email: string; role: string; organization_name: string;
  }>(`
    SELECT u.id user_id, s.organization_id, u.name, u.email, m.role::text, o.name organization_name
    FROM sessions s
    JOIN users u ON u.id=s.user_id AND u.status='ACTIVE'
    JOIN organizations o ON o.id=s.organization_id AND o.status='ACTIVE'
    JOIN memberships m ON m.user_id=u.id AND m.organization_id=o.id AND m.is_active=true
    WHERE s.token_hash=$1 AND s.expires_at > now()
    LIMIT 1
  `, [tokenHash(raw)]);
  return result.rows[0] ?? null;
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge
  };
}
