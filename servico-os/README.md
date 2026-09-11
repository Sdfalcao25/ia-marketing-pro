# ServiçoOS

SaaS multiempresa para prestadores de serviço: **cliente → orçamento → aprovação → ordem de serviço → execução → cobrança → documento fiscal → pós-venda**.

## Stack

- Next.js 16 + React 19 + TypeScript
- PostgreSQL
- `pg` com SQL parametrizado e migrations versionadas
- Sessões server-side com token aleatório e hash SHA-256 no banco
- Senhas com `scrypt` nativo do Node.js
- Docker / Docker Compose
- Validação com Zod

## Módulos entregues nesta base

- Landing page e autenticação
- Multi-tenant por organização
- RBAC: OWNER, ADMIN, MANAGER, TECHNICIAN, FINANCE
- Dashboard operacional
- Clientes
- Catálogo de serviços
- Orçamentos e itens
- Ordens de serviço e itens
- Histórico de status/eventos
- Pagamentos e estrutura para Pix/cartão
- Estrutura para NFS-e
- Integrações, webhooks, outbox e chaves de API
- Auditoria
- Portal/API-ready

## Subir localmente

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Acesse `http://localhost:3000`.

Credenciais de demonstração vêm das variáveis `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`. **Troque-as em qualquer ambiente fora de desenvolvimento.**

## Comandos

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run db:migrate
npm run db:seed
npm run db:create-admin
```

## Segurança

- Nunca commite `.env`.
- Sessões usam cookie `httpOnly`, `sameSite=lax`, `secure` em produção.
- Tokens de sessão não são persistidos em texto puro.
- Consultas de dados de negócio exigem `organization_id`.
- API usa SQL parametrizado.
- Integrações devem armazenar segredos em secret manager no ambiente de produção.

Veja `docs/ARCHITECTURE.md` e `docs/DEPLOYMENT.md`.
