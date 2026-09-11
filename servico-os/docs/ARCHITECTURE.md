# Arquitetura — ServiçoOS

## Objetivo

O ServiçoOS é um SaaS B2B multiempresa para organizar o ciclo operacional completo de empresas prestadoras de serviço. A aplicação foi desenhada para crescer sem acoplar o core a um provedor específico de pagamento, mensageria ou emissão fiscal.

## Camadas

1. **Web/UI** — Next.js App Router, server components e formulários.
2. **API** — Route handlers REST sob `/api`.
3. **Domínio** — autenticação, tenant, numeração documental, validação e regras de autorização.
4. **Persistência** — PostgreSQL com migrations SQL versionadas.
5. **Integrações** — tabela `integrations`, `webhook_subscriptions` e `outbox_events`.

## Multi-tenancy

Toda entidade de negócio pertence a uma `organization_id`. A sessão também carrega a organização ativa. O isolamento é aplicado no servidor: consultas e mutações sempre usam a organização da sessão, nunca um tenant informado pelo cliente.

## Papéis

- OWNER: proprietário do tenant
- ADMIN: administração ampla
- MANAGER: gestão operacional
- TECHNICIAN: execução de OS
- FINANCE: cobrança, pagamentos e documentos fiscais

## Fluxo principal

`Customer -> Quote -> WorkOrder -> Payment -> FiscalDocument`

Orçamentos e OS têm numeração atômica por organização através de `document_counters`.

## Segurança

- Hash de senha: scrypt.
- Sessão: token criptograficamente aleatório; apenas SHA-256 persistido no banco.
- Cookies: HttpOnly, SameSite=Lax, Secure em produção.
- SQL parametrizado.
- `audit_logs` para eventos sensíveis.
- `api_keys` guarda somente `key_hash`; o segredo real não deve ser persistido.
- `outbox_events` permite integrações com entrega confiável sem travar transações do core.

## Integrações futuras

Adapters podem ser implementados para Pix/Open Finance, gateways, WhatsApp, e-mail, NFS-e Nacional e storage S3-compatible. O core continua independente do fornecedor.
