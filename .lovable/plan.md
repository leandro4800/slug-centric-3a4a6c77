## Objetivo
Completar o painel admin do site (`/site/admin`) com a estrutura visual das telas de referência, dar funcionalidade real aos botões de Treino/Dieta/Avaliação Física e adicionar ferramentas (links externos + planilhas IA). Tudo continua isolado do app — nada de rotas `/:slug/app/*`.

## 1. Sidebar — novos itens
Reordenar/expandir `SiteAdminSidebar.tsx`:
- Resumo (Dashboard) — ícone Home
- Alunos
- Cadastrar aluno
- Agenda *(placeholder Em breve)*
- Montar treino
- Montar dieta
- Avaliação física (7 dobras)
- Ferramentas *(novo grupo: Links externos, Planilhas IA, Stories)*
- Financeiro / Faturamento
- Aparência
- Minha conta *(novo: dados básicos do coach + plano)*
- Suporte *(novo: tutoriais + WhatsApp)*

## 2. Resumo (Dashboard) — refazer
Substituir Dashboard atual por uma versão completa:
- Banner de status da conta (ativa/inativa) quando aplicável
- Saudação personalizada ("Boa noite, {nome}")
- **Primeiros passos** (checklist): Cadastrar aluno · Montar treino · Montar dieta · Fazer avaliação — marca como concluído conforme dados existem
- KPIs: Alunos ativos, Atendimentos pendentes, Feedbacks pendentes, Conversas não lidas, Taxa de renovação, Desistências (30 dias)
- Métricas financeiras: Resumo diário, Vendas por período, Vendas mensais, Ticket médio, Expectativa de renovação, Meta mensal
- Próximos vencimentos
- Atalhos rápidos para Cadastrar aluno / Montar treino / Avaliação física

Tudo lendo das tabelas existentes (`perfis`, `assinaturas`). Métricas sem dados mostram "—" ou R$ 0,00.

## 3. Montar Treino e Montar Dieta — funcional
Substituir os placeholders pelas páginas reais reaproveitando `AdminMontarTreino.tsx` e `AdminMontarDieta.tsx`, mas:
- Sem `AdminBackButton` (volta para `/site/admin/dashboard` no header local)
- Tela de seleção de aluno carregando perfis do tenant do coach (sem depender do BrandingProvider)
- Após salvar, voltar para a lista

Solução: criar wrappers `site-admin/MontarTreino.tsx` e `MontarDieta.tsx` que:
1. Listam alunos do tenant (mesma query do `Alunos.tsx`)
2. Ao escolher um aluno → renderizam o componente original passando `aluno_id` via search param
3. Override do botão "voltar" e do contexto de tenant

## 4. Avaliação Física (7 dobras)
Página dedicada `AvaliacaoFisica.tsx`:
- Seletor: **aluno existente** (lista do tenant) **ou** **aluno avulso** (preencher nome + idade + sexo + peso + altura)
- Quando "avulso" → cria um registro em `perfis` com `tenant_id` do coach (sem auth user — viável pois `perfis.id` é UUID livre, sem FK para auth.users) e marca com flag
- Abre o `JacksonPollockCalculator` já existente passando o `alunoId` resultante
- Histórico de avaliações do aluno fica salvo normalmente

Edge function nova `site-create-aluno-avulso` (service role) cria o perfil sem mandar email/criar auth.

## 5. Ferramentas — nova seção
Página `Ferramentas.tsx` com 3 cards/tabs reaproveitando componentes já existentes do Hub do Coach:
- **Links externos / Vendas** → `SalesLinkConfig`
- **Planilhas de treino IA** → `WorkoutSpreadsheetGenerator`
- **Stories de marketing** → `StoriesGenerator` (opcional, sem fullscreen)

Sem alterar nada nos componentes — só importá-los na nova página.

## 6. Minha conta + Suporte
- `MinhaConta.tsx`: dados do tenant (nome, slug, email, data registro), plano atual (`assinaturas` do owner, se houver), link Termos
- `Suporte.tsx`: lista estática de tutoriais + botão WhatsApp + canal Comunidade (mesmo estilo da imagem de referência)

## 7. Roteamento
Adicionar em `App.tsx` dentro do bloco `/site/admin`:
- `resumo` (alias do dashboard)
- `agenda` (placeholder)
- `ferramentas`
- `minha-conta`
- `suporte`

Manter rotas atuais.

## Arquivos a criar
- `src/pages/site-admin/MontarTreino.tsx` (wrapper)
- `src/pages/site-admin/MontarDieta.tsx` (wrapper)
- `src/pages/site-admin/AvaliacaoFisica.tsx`
- `src/pages/site-admin/Ferramentas.tsx`
- `src/pages/site-admin/MinhaConta.tsx`
- `src/pages/site-admin/Suporte.tsx`
- `supabase/functions/site-create-aluno-avulso/index.ts`

## Arquivos a editar
- `src/components/site-admin/SiteAdminSidebar.tsx` — novos itens + grupos
- `src/pages/site-admin/SiteAdminLayout.tsx` — atualizar mobile items
- `src/pages/site-admin/Dashboard.tsx` — versão completa
- `src/App.tsx` — novas rotas
- `supabase/config.toml` — registrar nova edge function

## Não tocar
- Aplicativo (`/:slug/app/*`), `BackHandler`, `PageHeader`, `AdminBackButton`
- Componentes do Hub do Coach (`StoriesGenerator`, `WorkoutSpreadsheetGenerator`, `SalesLinkConfig`) — apenas reutilizados
- `JacksonPollockCalculator`, `AdminMontarTreino`, `AdminMontarDieta` — apenas envolvidos por wrappers

## Observação sobre Avaliação Física para alunos avulsos
O `JacksonPollockCalculator` exige `alunoId`. Como `perfis.id` é UUID sem FK para `auth.users`, dá pra criar perfis avulsos (sem login no app) só com `tenant_id` do coach. Esses alunos aparecem na lista normal com badge "Sem app". Se o coach quiser depois dar acesso, basta cadastrar no fluxo normal usando o mesmo email.

Posso começar?