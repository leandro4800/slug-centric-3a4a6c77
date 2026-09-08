# Plano: Corrigir split Stripe Connect (bug do "dono-plataforma")

## Contexto
Hoje `stripe-checkout` decide se um tenant dispensa o split checando `!tenant_to_use.stripe_account_id`. Qualquer coach que ainda não iniciou o onboarding Connect (sem `stripe_account_id`) cai nesse caminho: o checkout completa sem split, o dinheiro fica todo na conta Stripe da plataforma, sem repasse pro coach e sem erro. Já existe a coluna `tenants.is_platform_owned` (default false), marcada `true` só para o tenant `alphateam` (id `6c4ff89c-3d9f-4225-ae95-5bf1dbf35886`), único de fato da plataforma.

## Mudança 1 — Edge function `supabase/functions/stripe-checkout/index.ts`
Arquivo: `supabase/functions/stripe-checkout/index.ts`

1. Na query do plano (linha ~105), incluir `is_platform_owned` no select:
   - De: `.select("*, tenants!inner(id,slug,nome,status,is_partner)")`
   - Para: `.select("*, tenants!inner(id,slug,nome,status,is_partner,is_platform_owned)")`
   - (O caminho de `aula_avulsa` já usa `select("*")`, então já recebe `is_platform_owned` automaticamente.)

2. Trocar a detecção de "dono da plataforma" (linha 134):
   - De: `const isPlatformOwned = !tenant_to_use.stripe_account_id;`
   - Para: `const isPlatformOwned = !!tenant_to_use.is_platform_owned;`

Com isso, qualquer tenant que não seja `alphateam` e ainda não tenha `stripe_onboarding_completed = true` cai no `throw` já existente ("Coach ainda não concluiu o cadastro Stripe Connect para receber pagamentos."), bloqueando a venda até o coach terminar o onboarding — em vez de deixar passar sem split.

## Mudança 2 — Aviso no painel do coach (Dashboard)
Arquivo: `src/pages/site-admin/Dashboard.tsx`

Acrescentar, dentro do `useEffect` que já carrega dados do tenant, uma leitura de `tenants_private.stripe_onboarding_completed` e de `tenants.is_platform_owned` (via `useSiteTenant().tenant`, que já traz `is_platform_owned`), guardando em estado `stripeIncomplete` (`true` quando `!is_platform_owned && !stripe_onboarding_completed`).

Quando `stripeIncomplete` for `true`, renderizar um aviso visível (banner amber/vermelho, ícone `AlertCircle`) logo abaixo do header do painel — antes da seção "Primeiros passos" — com texto tipo:
"Conta de recebimento não configurada — seus alunos não vão conseguir assinar até você concluir o cadastro Stripe Connect."
e um botão/CTA que chama a função já existente `stripe-connect-onboard` (mesma invocação usada em `Financeiro.tsx`: `supabase.functions.invoke("stripe-connect-onboard", { body: { tenant_id: tenant.id, return_path: window.location.pathname } })` e redireciona para `data.url`). Reaproveitar a lógica de erro já usada em `Financeiro.tsx` (clonar o contexto do erro para extrair a mensagem).

Não mexer em `coach-platform-checkout` nem em `Financeiro.tsx`.

## Não incluído
- `coach-platform-checkout` (fluxo de coach pagando a Alpha Coach Pro) — fora do escopo.
- `Financeiro.tsx` — já mostra o status; não será alterado.

## Validação
- Reimplantar `stripe-checkout` após a edição.
- Verificar no painel de um coach sem onboarding que o aviso aparece e o botão abre o Stripe Connect.
- Confirmar que `alphateam` não mostra o aviso (`is_platform_owned = true`).
