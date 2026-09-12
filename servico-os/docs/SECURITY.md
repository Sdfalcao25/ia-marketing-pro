# Segurança — ServiçoOS

## Princípios aplicados

- isolamento por `organization_id` em todas as consultas operacionais;
- senhas com `scrypt` e salt individual;
- token de sessão aleatório com apenas SHA-256 persistido no banco;
- cookies `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
- SQL parametrizado;
- RBAC por função;
- auditoria das ações críticas;
- segredos de integrações referenciados, não armazenados em código;
- chaves de API armazenadas apenas por hash;
- eventos assíncronos desacoplados via outbox.

## Antes de produção pública

1. Adicionar rate limiting no edge/proxy para login e APIs sensíveis.
2. Configurar HTTPS obrigatório e HSTS.
3. Implementar verificação de e-mail e recuperação segura de senha.
4. Adotar secret manager para credenciais externas.
5. Executar análise de dependências e atualização automatizada.
6. Adicionar testes E2E e testes de autorização entre tenants.
7. Revisar LGPD, retenção, exportação e exclusão de dados.
8. Definir política de logs sem dados sensíveis.
9. Implementar idempotência para webhooks de pagamento/fiscal.
10. Realizar backup, restore testado e plano de resposta a incidentes.

## Regra de tenant

Nenhuma rota deve aceitar `organization_id` do corpo da requisição como fonte de autoridade. A organização ativa deve sempre vir da sessão autenticada ou, futuramente, de uma API key previamente associada ao tenant.
