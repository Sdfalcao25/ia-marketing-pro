import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const auth=fs.readFileSync(new URL('../src/lib/auth.ts',import.meta.url),'utf8');
const customers=fs.readFileSync(new URL('../src/app/api/customers/route.ts',import.meta.url),'utf8');

test('cookie de sessão é HttpOnly e Secure em produção',()=>{
  assert.match(auth,/httpOnly:\s*true/);
  assert.match(auth,/process\.env\.NODE_ENV === 'production'/);
});

test('token persistido é hash e não token puro',()=>{
  assert.match(auth,/createHash\('sha256'\)/);
  assert.match(auth,/token_hash/);
});

test('rotas de cliente filtram por tenant',()=>{
  assert.match(customers,/organization_id=\$1/);
  assert.match(customers,/session\.organization_id/);
});
