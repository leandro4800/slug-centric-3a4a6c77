## Contexto

Franco (`coachfranco`) e Pedro (`pedropassosteam`) foram cadastrados direto como coaches (owners de tenant), sem passar pelo onboarding de aluno. Por isso não têm anamnese, avaliação física nem informações de perfil preenchidas. Brenno (aluno do `alphateam`) precisa passar pelo fluxo padrão de anamnese ao entrar no app.

## O que fazer

### 1. Coaches Franco e Pedro — App (aluno view)
Eles hoje entram direto no app do próprio tenant (como owner/coach) e pulam o onboarding. Vou:
- Detectar quando um coach-owner ainda não tem `anamnese_aluno` + `avaliacoes_fisicas` preenchidas.
- Direcionar 1x para o mesmo fluxo `/onboarding` que os alunos fazem (preenchimento inicial de anamnese + avaliação física), gravando os dados sob o próprio user_id no tenant dele.
- Após concluir, marcar `onboarding_completo = true` e liberar acesso normal ao app.

Isso reaproveita 100% do fluxo existente (`Onboarding.tsx` + `complete_student_onboarding`), sem criar tela nova.

### 2. Painel do coach no site — botão "Meu Perfil de Coach"
No sidebar do site-admin (`SiteAdminSidebar`) adicionar item **"Meu Perfil"** apontando para nova rota `/site/admin/meu-perfil` com uma página que reúne em abas:

- **Dados pessoais**: nome completo, telefone, data de nascimento, sexo, foto (`perfis`).
- **Anamnese**: mesmos campos de `anamnese_aluno` (reaproveita componente `AnamneseDetails` em modo edição).
- **Avaliação física**: reaproveita `ComprehensiveEvaluationForm` já existente, salvando em `avaliacoes_fisicas` com `aluno_id = coach.id`.
- **Landing page do coach**: campos de `tenants` (`nome`, `tagline`, `bio`, `especialidades`, `cidade`, `estado`, `logo_url`, `foto_url`, `hero_url`, `login_video_url`, `music_url`, cores primárias/accent). Reaproveita o que já existe em `IdentidadeVisual` / `AdminPanel` — vou extrair/reutilizar sem duplicar lógica.

Só uma página nova (`MeuPerfil.tsx`) + entrada no sidebar + rota. Sem migrations.

### 3. Brenno — anamnese padrão
Brenno (`brennoalvezx@gmail.com`) está hoje com `onboarding_completo = true` via trigger `auto_activate_vip_subscription`. Vou:
- Resetar `onboarding_completo = false` para ele e limpar dados de anamnese/avaliação se estiverem vazios (mantendo assinatura VIP + role de aluno intactos).
- Assim, no próximo login ele cai no `/onboarding` normal e preenche anamnese + avaliação como qualquer aluno novo.

### 4. Landing page personalizada
Já existe `TenantLanding.tsx` puxando `logo_url`, `foto_url`, `hero_url`, `bio`, `especialidades`, etc. do tenant. Basta que Franco/Pedro preencham esses campos na nova aba "Landing" do Meu Perfil — a landing já renderiza automaticamente.

## Detalhes técnicos

Arquivos alterados/criados:
- `src/pages/site-admin/MeuPerfil.tsx` (novo) — abas Perfil / Anamnese / Avaliação / Landing.
- `src/components/site-admin/SiteAdminSidebar.tsx` — adicionar item "Meu Perfil".
- `src/pages/site-admin/SiteAdminLayout.tsx` (ou onde as rotas do site-admin são declaradas) — adicionar rota.
- `src/components/RequireAuth.tsx` — coach-owner sem anamnese/avaliação preenchidas cai em `/onboarding` uma vez (checagem barata + cache localStorage como já usamos hoje).
- Data patch (via `supabase--insert`): `perfis.onboarding_completo = false` para `brennoalvezx@gmail.com`.

Sem novas tabelas, sem novas edge functions.

## Fora do escopo
- Não altero `ExerciseCard` (travado).
- Não altero fluxo de pagamento nem partners.
- Não crio nada específico só para Franco/Pedro — a página "Meu Perfil" fica disponível para qualquer coach owner.
