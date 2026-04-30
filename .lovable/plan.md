
# Marketplace Híbrido + Stripe Connect + Onboarding

## Visão geral do fluxo

```
Aluno
 ├─ Marketplace (/)  ─────► escolhe coach ─► /[slug]/checkout ─► Stripe ─► signup ─► onboarding ─► /[slug]/app
 └─ Link direto (/[slug]) ──────────────────► /[slug]/checkout ─► Stripe ─► signup ─► onboarding ─► /[slug]/app

Coach
 └─ /seja-coach ─► cadastro ─► onboarding Stripe Connect ─► aguarda aprovação ─► admin aprova ─► aparece no marketplace

Admin AlphaCoach
 └─ /admin/coaches ─► aprova/rejeita coaches pendentes
```

Stripe Connect Express: cada coach tem `stripe_account_id`. Pagamento do aluno usa `application_fee_percent: 10` → 10% fica na conta AlphaCoach, 90% vai pro coach automaticamente.

---

## Parte 1 — Banco de dados

### Novas colunas em `tenants`
- `status` (`pending` | `approved` | `rejected` | `suspended`) — controla visibilidade no marketplace
- `bio`, `foto_url`, `especialidades` (text[]) — vitrine pública
- `stripe_account_id` — conta Connect do coach
- `stripe_onboarding_completed` (bool)
- `owner_user_id` — coach dono do tenant

### Nova tabela `planos`
Planos de assinatura por coach. Campos: `tenant_id`, `nome`, `descricao`, `preco_centavos`, `intervalo` (`mensal`|`trimestral`|`anual`), `stripe_price_id`, `ativo`, `ordem`.

### Nova tabela `assinaturas`
Vínculo aluno↔tenant pago. Campos: `aluno_id`, `tenant_id`, `plano_id`, `stripe_subscription_id`, `stripe_customer_id`, `status` (`active`|`canceled`|`past_due`|`trialing`), `current_period_end`, `cancelada_em`.

### Nova tabela `anamnese_aluno` (1:1 com aluno)
Campos tipados: `doencas[]`, `medicamentos`, `historico_familiar`, `cirurgias`, `lesoes_atuais`, `qualidade_sono`, `nivel_estresse`, `tabagismo`, `alcool`, `suplementos[]`, `alimentos_ama`, `alimentos_evita`, `restricoes_alimentares[]`, `refeicoes_dia`, `agua_litros`, `anos_treino`, `modalidades_anteriores[]`, `tempo_recuperacao`, `disponibilidade_dias[]`.

### Nova tabela `avaliacoes_fisicas` (histórico — N por aluno)
Campos: `aluno_id`, `data`, `peso_kg`, `altura_cm`, `pescoco_cm`, `cintura_cm`, `quadril_cm` (mulheres), `bf_pct_calculado` (US Navy), `imc`, `massa_magra_kg`, `massa_gorda_kg`, `foto_frente_url`, `foto_lado_url`, `foto_costas_url`.

### Coluna em `perfis`
- `onboarding_completo` (bool) — gate pra liberar `/app`

### RLS
- `tenants`: público vê só `status='approved'`; coach gerencia o próprio; admin tudo.
- `planos`: público vê ativos de tenants aprovados; coach gerencia os seus.
- `assinaturas`: aluno vê as próprias; coach vê do seu tenant; admin tudo.
- `anamnese_aluno` / `avaliacoes_fisicas`: aluno gerencia o próprio; coach do tenant vê.

---

## Parte 2 — Stripe Connect (edge functions)

Necessário: secret `STRIPE_SECRET_KEY` (sua conta plataforma) + `STRIPE_WEBHOOK_SECRET`.

| Função | O que faz |
|---|---|
| `stripe-connect-onboard` | Cria Account Express do coach, retorna `accountLink` pra completar KYC |
| `stripe-connect-refresh` | Reabre onboarding se incompleto |
| `stripe-create-plan` | Cria Product + Price no Stripe quando coach cria plano |
| `stripe-checkout` | Cria Checkout Session com `application_fee_percent: 10` e `transfer_data.destination = coach.stripe_account_id` |
| `stripe-webhook` | Escuta `checkout.session.completed`, `customer.subscription.updated/deleted`, `account.updated` → atualiza `assinaturas`, `tenants.stripe_onboarding_completed`, vincula `aluno.tenant_id` |
| `stripe-portal` | Portal do cliente (cancelar/trocar plano) |

Vínculo aluno→tenant acontece no webhook `checkout.session.completed` usando `metadata.tenant_id` da sessão.

---

## Parte 3 — Frontend (rotas novas)

| Rota | Página |
|---|---|
| `/` | Marketplace público — grid de coaches aprovados |
| `/seja-coach` | Cadastro de coach (form + signup + onboarding Stripe) |
| `/[slug]` | Landing pública do tenant (bio, planos, CTA) |
| `/[slug]/checkout?plano=:id` | Inicia Stripe Checkout |
| `/checkout/sucesso` | Pós-pagamento → força signup/login → onboarding |
| `/onboarding` | Wizard 3 etapas (Perfil → Anamnese → Avaliação Física) |
| `/admin/coaches` | Aprovar/rejeitar coaches pendentes (só super-admin) |
| `/[slug]/admin/planos` | Coach gerencia planos |
| `/[slug]/admin/financeiro` | Coach vê assinantes, MRR, Stripe Express dashboard link |

Rotas existentes `/[slug]/app/*` ganham guard: redireciona pra `/onboarding` se `onboarding_completo=false` ou `assinatura.status≠active`.

---

## Parte 4 — Onboarding do aluno (3 etapas, design dark premium)

1. **Perfil** — nome, sexo, data nascimento, telefone, foto.
2. **Anamnese** — sub-passos: Saúde → Hábitos → Nutrição → Treino (form em accordion ou stepper).
3. **Avaliação Física** — peso, altura, pescoço, cintura (+quadril se mulher) → calcula BF pela fórmula US Navy no cliente, salva snapshot em `avaliacoes_fisicas`.

Fórmula US Navy:
- Homens: `BF% = 495 / (1.0324 - 0.19077·log10(cintura - pescoço) + 0.15456·log10(altura)) - 450`
- Mulheres: `BF% = 495 / (1.29579 - 0.35004·log10(cintura + quadril - pescoço) + 0.22100·log10(altura)) - 450`

---

## Ordem de implementação (entregáveis)

1. **Migration** — todas as tabelas + RLS + colunas novas.
2. **Stripe Connect onboarding** — coach se cadastra, conecta Stripe, aguarda aprovação.
3. **Marketplace + landing do tenant** — vitrine pública.
4. **Checkout + webhook** — pagamento real, vínculo automático.
5. **Onboarding aluno** — wizard 3 etapas com cálculo BF.
6. **Painel admin AlphaCoach** — aprovar coaches.
7. **Painel financeiro do coach** — assinantes, MRR.

---

## Detalhes técnicos

- **Memória respeitada**: tudo no tema Netflix (vermelho #E50914, preto, branco). Glassmorphism nos cards.
- **Multi-tenant**: `BrandingProvider` continua resolvendo cores/logo por slug.
- **Segurança**: webhook Stripe valida assinatura; RLS bloqueia tudo; super-admin via `user_roles.role='admin'` (sem tenant_id).
- **Secrets necessários**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (peço depois da migration aprovada).
- **Stripe BYOK**: vou usar `enable_stripe` (BYOK) porque Connect/marketplace exige sua própria conta — o built-in da Lovable não suporta split.
- **Status de assinatura**: guard de rota checa `assinaturas.status='active'` antes de liberar `/[slug]/app`.

Aprova esse plano que eu começo pela migration.
