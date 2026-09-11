# Deployment

## Produção mínima

- Node.js 24 LTS
- PostgreSQL gerenciado
- HTTPS obrigatório
- backup diário do banco
- secret manager para `DATABASE_URL` e credenciais de integrações
- logs centralizados

## Sequência

1. Provisionar PostgreSQL.
2. Configurar `DATABASE_URL`.
3. Executar `npm run db:migrate`.
4. Criar primeiro usuário com `npm run db:create-admin`.
5. Executar `npm run build` e iniciar com `npm start`.
6. Colocar reverse proxy/CDN com TLS.

## Checklist antes de vender

- domínio próprio
- política de backup e restore testada
- monitoramento de uptime
- rate limiting no edge/proxy
- SMTP/transacional
- storage de anexos
- gateway Pix/cartão
- NFS-e conforme município/padrão nacional aplicável
- termos de uso e privacidade
- rotina de exportação/exclusão LGPD
