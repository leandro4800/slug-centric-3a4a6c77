# Corrigir definitivamente o acesso do superadmin

## Diagnóstico confirmado

- As rotas globais `/admin/coaches` e `/admin/debug-push` usam `RequireAuth requireRole="admin"`.
- O guard consulta somente o estado `roles` do `AuthProvider`; ele não consulta uma RPC no momento da decisão.
- No login, `get_my_app_destination()` devolve apenas o papel relacionado ao destino principal. Como `alphacoachapp@gmail.com` é dono do tenant `alphateam`, o retorno é `coach`.
- Esse único papel é salvo em `sessionStorage` como `auth_roles_prefetch_v1`. O `AuthProvider` encontra esse valor não vazio, assume incorretamente que ele representa todas as permissões e encerra o carregamento sem consultar `user_roles`. Assim, `hasRole("admin")` retorna falso embora o registro exista no banco.
- A RLS atual de `user_roles` não está removendo nem ocultando a role do próprio usuário: `roles_select_own` permite `auth.uid() = user_id`, e o papel `authenticated` possui `SELECT`.
- As três linhas admin globais são possíveis porque `UNIQUE (user_id, role, tenant_id)` permite várias linhas quando `tenant_id IS NULL`. Por isso os antigos `INSERT ... ON CONFLICT DO NOTHING` não detectaram conflito. As datas das três linhas correspondem às migrações corretivas repetidas.
- A role adicional `coach` para `alphateam` é legítima e é mantida automaticamente pelos triggers de proprietário do tenant; ela não substitui a role global `admin` no banco.

## Correção

1. Alterar o `AuthProvider` para tratar o prefetch do login apenas como estado provisório, nunca como lista autoritativa completa.
2. Sempre carregar a lista completa de `user_roles` do usuário autenticado antes de declarar `rolesReady=true`; preservar roles já conhecidas durante retries para evitar falso “Acesso Restrito”.
3. Ajustar o fluxo de login para não publicar uma única role de destino como se fosse a coleção completa de permissões.
4. Aplicar migração idempotente que:
   - mantém somente a linha global admin mais antiga de `alphacoachapp@gmail.com`;
   - cria um índice único parcial para `(user_id, role)` quando `tenant_id IS NULL`, impedindo novas duplicatas globais;
   - mantém intacta a role `coach` vinculada ao tenant `alphateam` e todas as demais roles tenant-scoped.
5. Não alterar as policies RLS atuais nesta correção, pois elas não são a causa do bloqueio observado.

## Validação

- Confirmar no banco exatamente uma role `admin` com `tenant_id NULL` e uma role `coach` de `alphateam` para a conta.
- Confirmar que uma nova tentativa de inserir o mesmo admin global falha por unicidade, provando que a duplicação não volta.
- Testar login/reload e acesso a `/admin/coaches` com a conta autenticada, verificando que o guard recebe a role admin completa.
- Testar uma conta não-admin para confirmar que `/admin/coaches` continua bloqueada.
- Rodar o linter/scan de segurança após a migração e verificar o fluxo final no preview.
