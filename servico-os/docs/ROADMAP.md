# Roadmap de produção

A base atual cobre o core transacional sem IA. Próximas integrações devem ser implementadas como adapters, sem contaminar o domínio.

## P0 — antes de clientes pagantes

- storage de fotos/anexos S3-compatible
- recuperação de senha e verificação de e-mail
- rate limiting no proxy/edge
- monitoramento, alertas, backups e teste de restore
- páginas legais LGPD
- testes E2E de login, cliente, orçamento, OS e cobrança

## P1 — monetização

- Pix Cobrança / Pix Automático via PSP
- cartão e links de pagamento
- webhooks assinados + idempotência
- NFS-e por adapter de provedor/padrão nacional
- e-mail transacional e WhatsApp oficial
- planos, limites de uso e billing do SaaS

## P2 — operação avançada

- agenda/calendário de técnicos
- upload de fotos antes/depois
- assinatura do cliente
- checklist por tipo de serviço
- roteirização
- estoque/consumo de materiais
- contratos recorrentes e manutenção preventiva
- portal do cliente
- PWA/offline para técnicos

## P3 — plataforma

- API pública versionada
- marketplace de integrações
- white-label
- multiunidade/franquias
- SSO/SAML para Enterprise
