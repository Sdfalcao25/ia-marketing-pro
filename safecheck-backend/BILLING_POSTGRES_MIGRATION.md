# SafeCheck AI — Migração do Billing para PostgreSQL/Supabase

## Objetivo

Substituir o estado financeiro dinâmico/KV utilizado pelo adaptador Asaas por um modelo relacional no PostgreSQL do Supabase, com integridade referencial, índices, RLS, idempotência de webhook, auditoria e rate limit atômico.

## Fonte de verdade desejada

Após o cutover, `public.safecheck_billing_subscriptions` será a fonte canônica do entitlement Pro/Premium. O frontend e o Android continuarão consultando `safecheck-billing`; eles não devem escrever diretamente nas tabelas financeiras.

## Tabelas

### `safecheck_billing_subscriptions`
Uma linha por usuário/provedor. Guarda plano, status, preço, IDs Asaas, período, cancelamento e troca pendente.

### `safecheck_billing_checkout_sessions`
Ciclo de vida de checkouts. Separa `checkout_pending` do entitlement real e permite reuso controlado até a expiração.

### `safecheck_billing_webhook_events`
Ledger idempotente de eventos. `provider + provider_event_id` é único. Armazena hash e detalhes minimizados; não deve receber dados completos de cartão.

### `safecheck_billing_audit_log`
Trilha append-only de transições de estado para suporte, investigação e auditoria.

### `safecheck_billing_rate_limits`
Rate limit atômico de checkout e operações de assinatura.

## Segurança

- RLS habilitado em todas as tabelas.
- `authenticated` pode apenas ler a própria assinatura e os próprios checkouts.
- INSERT/UPDATE/DELETE financeiro é server-only.
- `anon` não recebe privilégios.
- Eventos, auditoria e rate limit não são expostos ao cliente.
- IDs do provedor possuem índices/uniques apropriados.
- Webhook deve ser processado com claim idempotente antes de qualquer transição.
- Nunca armazenar API key Asaas, CVV, número completo de cartão ou token de cartão nessas tabelas.

## Cutover sem downtime

1. Aplicar `002_structured_billing_postgres.sql`.
2. Validar Security Advisor e políticas RLS.
3. Configurar credencial server-side do AppDeploy para escrever no Supabase; nunca no frontend/APK.
4. Publicar adaptador Asaas em modo `dual_write`: PostgreSQL + KV atual.
5. Comparar leituras por usuário/evento durante a janela de validação.
6. Migrar qualquer estado Asaas pré-existente, se houver.
7. Alterar leitura primária para PostgreSQL com fallback temporário ao KV.
8. Depois de estabilidade, remover writes no KV e manter fallback somente por uma release.
9. Remover fallback KV numa versão posterior.

## Regra de entitlement

Somente `status IN ('active','trialing')` concede Pro/Premium. Checkout visual, retorno do navegador ou `checkout_pending` nunca concedem acesso.

## Troca de plano

`pending_plan` não muda o entitlement imediatamente. A alteração torna-se canônica somente quando o evento de pagamento/renovação correspondente for confirmado com valor compatível com o plano de destino.

## Cancelamento

`cancel_at_period_end = true` mantém o plano ativo até `current_period_end`. Após o período, o billing retorna `free` e status cancelado.

## Backfill

Como a integração Asaas foi criada antes da primeira transação real completa validada, o esperado é que o backfill seja mínimo. Mesmo assim, o cutover deve verificar qualquer checkout/assinatura criada entre a implantação do Asaas e a migração.

## Rollback

Durante `dual_write`, rollback consiste em voltar a leitura para o estado KV sem apagar as novas tabelas. Nenhuma migration deve remover o armazenamento antigo na mesma release em que o PostgreSQL entra como fonte principal.

## Arquivos relacionados

- `safecheck-backend/migrations/002_structured_billing_postgres.sql`
- backend web: `backend/asaas-billing.ts` no snapshot AppDeploy
- Supabase Edge Functions: `safecheck-billing`, `safecheck-checkout`, `safecheck-subscription-manage`, `safecheck-paid-analyze`

## Critérios para concluir a migração

- schema aplicado em produção;
- RLS/advisors sem falhas críticas;
- dual-write confirmado;
- webhook idempotente confirmado;
- checkout Pro e Premium criando linhas estruturadas;
- cancelamento e troca refletidos no PostgreSQL;
- `safecheck-paid-analyze` usando entitlement do PostgreSQL;
- uma transação real autorizada validada ponta a ponta;
- nenhuma divergência entre estado Asaas e estado canônico durante a janela de observação.
