# Painel admin do site — isolado do aplicativo

## Problema

O painel atual do coach reaproveita rotas `/{slug}/admin/*` e componentes (`AdminBackButton`, `MeusAtletas`, `CoachDashboard`) que voltam para `/{slug}/app/...` — ou seja, caem dentro do aplicativo do aluno. Não é isso que queremos no site.

## Objetivo

Criar uma área **`/site/admin/*`** completamente separada, com sidebar fixa, navegação só entre telas do site, e fluxo de cadastro de aluno por email — sem nenhuma referência ao app.

## Estrutura nova

```
/site/admin                       → redireciona para /site/admin/dashboard
/site/admin/dashboard             → visão geral (KPIs, próximos pagamentos)
/site/admin/alunos                → lista de alunos do coach
/site/admin/alunos/novo           → cadastro de aluno (envia email com credenciais)
/site/admin/alunos/:id            → detalhe / edição do aluno
/site/admin/treinos               → montar treino
/site/admin/dieta                 → montar dieta
/site/admin/avaliacao-fisica      → avaliação física + 7 dobras
/site/admin/aparencia             → branding do tenant
/site/admin/faturamento           → financeiro
```

Todas usam `SiteAdminLayout` com sidebar lateral própria — nenhuma reusa componentes do app (`PageHeader`, `AdminBackButton`, `BackHandler`).

## Arquivos a criar

- `src/pages/site-admin/SiteAdminLayout.tsx` — layout com sidebar + outlet
- `src/components/site-admin/SiteAdminSidebar.tsx` — menu lateral com ícones/labels das 8 telas
- `src/pages/site-admin/Dashboard.tsx` — KPIs do tenant (reaproveita queries, não componentes do app)
- `src/pages/site-admin/Alunos.tsx` — lista própria (query direta em `perfis` pelo `tenant_id`)
- `src/pages/site-admin/NovoAluno.tsx` — formulário (nome, email, telefone, plano) → cria conta + envia email com user/senha
- `src/pages/site-admin/AlunoDetalhe.tsx` — perfil, treino atual, dieta atual
- `src/pages/site-admin/MontarTreino.tsx` — wrapper que envolve o builder existente sem o header/back do app
- `src/pages/site-admin/MontarDieta.tsx` — idem
- `src/pages/site-admin/AvaliacaoFisica.tsx` — formulário com cálculo de 7 dobras (Jackson-Pollock)
- `src/pages/site-admin/Aparencia.tsx` — wrapper do AdminPanel sem chrome do app
- `src/pages/site-admin/Faturamento.tsx` — wrapper

## Cadastro de aluno + email

1. Form em `NovoAluno.tsx` coleta nome, email, telefone, plano.
2. Chama edge function nova `site-create-aluno`:
   - cria usuário em `auth.users` (admin API) com senha aleatória
   - insere em `perfis` com `tenant_id` do coach
   - cria assinatura ativa no plano escolhido
3. Após criar, dispara email transacional `aluno-credenciais` com: link do app, email, senha temporária, instruções (igual à imagem de referência enviada antes).

Pré-requisito: infraestrutura de email transacional (`setup_email_infra` + `scaffold_transactional_email`). Se não estiver pronta, pedimos para configurar primeiro.

## Roteamento (`App.tsx`)

- Adicionar bloco `<Route path="/site/admin" element={<RequireAuth><SiteAdminLayout/></RequireAuth>}>` com filhos para cada tela.
- Atualizar `SiteLogin.tsx` para redirecionar para `/site/admin/dashboard` (em vez de `/{slug}/admin/dashboard`).
- Manter as rotas `/{slug}/admin/*` antigas intocadas (não quebrar nada do app).

## O que NÃO será tocado

- Nada em `src/pages/aluno/**`
- Nada em `src/pages/admin/**` (rotas antigas continuam funcionando para o app)
- `BackHandler`, `PageHeader`, `AdminBackButton` — permanecem como estão
- Capacitor / build mobile

## Implementação em duas fases

**Fase 1 (esta entrega):** layout + sidebar + dashboard + lista de alunos + cadastro de aluno com email + redirect do SiteLogin. Telas de treino/dieta/avaliação ficam como "Em breve" linkando para as antigas até a fase 2.

**Fase 2 (próxima):** Construir versões standalone de Montar Treino, Montar Dieta, Avaliação Física + 7 Dobras dentro de `/site/admin/*` sem dependências do app.

Posso começar pela Fase 1?
