# Banco de Dados — ServiçoOS

## Modelo de domínio

```text
organizations
  ├─ memberships ─ users ─ sessions
  ├─ customers
  │   ├─ quotes ─ quote_items
  │   ├─ work_orders ─ work_order_items
  │   │                 └─ work_order_events
  │   ├─ payments
  │   └─ fiscal_documents
  ├─ service_catalog
  ├─ integrations
  ├─ api_keys
  ├─ webhook_subscriptions
  ├─ outbox_events
  ├─ attachments
  └─ audit_logs
```

## Isolamento multiempresa

Entidades operacionais possuem `organization_id`. A aplicação obtém esse identificador exclusivamente da sessão autenticada; o cliente não escolhe o tenant nas requisições de negócio.

## Integridade

- UUID como identificador externo.
- `document_counters` gera números sequenciais atômicos por empresa para orçamento e OS.
- Foreign keys preservam vínculos de cliente, proposta, OS, cobrança e documento fiscal.
- Checks evitam quantidades negativas e valores monetários inválidos.
- Índices priorizam filtros por tenant, status e data.

## Auditoria e integrações

`audit_logs` registra operações críticas. `outbox_events` implementa a base do Transactional Outbox: a transação do domínio grava o evento e um worker futuro pode enviá-lo a WhatsApp, e-mail, gateway, NFS-e ou webhooks com retentativa.

## Backup

Para produção, usar PostgreSQL gerenciado com backup automático e Point-in-Time Recovery quando disponível. Restore deve ser testado periodicamente; backup não testado não deve ser tratado como estratégia de recuperação.
