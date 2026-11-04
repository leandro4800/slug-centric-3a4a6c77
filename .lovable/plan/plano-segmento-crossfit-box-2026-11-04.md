# Plano: segmento CrossFit (Box)

Personal e lutas não mudam em nada. Cada etapa termina com o app funcionando.

## O que já existe (conferido)
- `TreinoScreen.tsx` hoje só tem `if vertical === "fight"`; o resto vai para o treino personal.
- O gatilho `detect_tenant_vertical` só reclassifica quando a vertical é `personal`, e "condicionamento físico", "funcional", "studio" e "hiit" contam como crossfit. Por isso o erro aconteceu.
- METODOLOGIA JACKSON (`metodojackson`) já está como `personal`.
- `SejaCoach.tsx` ainda não pergunta o tipo de coach. A vertical depende só do gatilho.
- Já existem as tabelas `wods` e `benchmarks`, ambas com 0 linhas. Elas não serão usadas: as tabelas novas `box_*` substituem essa parte e as antigas ficam como estão.

## Etapa 1: cadastro por tipo
**Migração 1**
- `tenants.vertical_manual boolean not null default false`.
- Novo `detect_tenant_vertical`: se `vertical_manual = true`, devolve sem alterar nada. O resto continua igual para os tenants atuais.
- `update tenants set vertical_manual = true where slug = 'metodojackson'`.
- Uma regra no banco garante que só o dono do tenant (ou um admin) pode mudar `vertical`/`vertical_manual`, e só durante o cadastro. Isso aproveita a proteção de tenant que já existe.

**Código**
- `src/pages/SejaCoach.tsx`: novo seletor obrigatório com Personal, Nutricionista, CT de lutas e CrossFit. Grava `vertical` (personal/personal/fight/crossfit) e `vertical_manual = true`.
- `src/pages/Onboarding.tsx`: só se ele também criar tenants. Vou conferir na implementação.

## Etapa 2: base do CrossFit (presets)
**Migração 2**: tabela `box_presets`, só leitura para quem está logado. São 9 presets: Iniciante, Intermediário e Avançado × 3x, 4x e 5x, cada um com a estrutura semanal de blocos. Não há opção de foco.

## Etapa 3: turmas, WOD e resultados
**Migração 3**: todas as tabelas recebem os acessos necessários e regras por tenant.
- `box_turmas` (tenant_id, nome, horario, ativo).
- `box_turma_alunos` (tenant_id, turma_id, aluno_id; uma linha por aluno em cada turma).
- `box_wods` (tenant_id, turma_id, data, titulo, aquecimento, forca_skill jsonb, acessorio, formato com os tipos AMRAP/EMOM/FOR_TIME/RFT/CHIPPER/TABATA/LADDER, time_cap_seg, rounds, movimentos jsonb com Rx/Scaled, benchmark_nome, publicado).
- `box_resultados` (tenant_id, wod_id, aluno_id, escala rx/scaled, tempo_seg, rounds, reps, carga_kg, observacao; um resultado por aluno em cada WOD).
- `box_benchmark_prs` (tenant_id, aluno_id, benchmark, resultado, data). Também pode ser calculado a partir de `box_resultados` com `benchmark_nome`.
- Quem pode fazer o quê: coach/admin do tenant gerenciam tudo. O aluno lê as turmas e WODs publicados das turmas dele e o ranking (resultados da turma no mesmo tenant). Ele só cria e edita o próprio resultado. A checagem de tipo de WOD e de escala é feita por gatilho.
- O bloco de força grava em `series_executadas`, o mesmo registro de carga × reps que já existe.

## Etapa 4: telas e rotas
**Aluno**: `/:slug/app/box` (pasta `src/pages/aluno/box/`)
- `BoxHome.tsx`: WOD do dia da turma, com os blocos.
- `WodTimer.tsx`: contagem regressiva no AMRAP, EMOM e Tabata; progressiva no For Time, RFT, Chipper e Ladder, parando no time cap. Usa o relógio real, como o cronômetro de descanso.
- `LancarResultado.tsx`: escolha Rx/Scaled e campos conforme o formato.
- `RankingDia.tsx`: Rx primeiro, depois Scaled, ordenado pelo critério do formato.
- `BenchmarkPrs.tsx`.
- `TreinoScreen.tsx`: só uma linha nova, `if vertical === "crossfit" return <BoxHome/>`.
- `AlunoHome.tsx`: card "WOD do dia" só para crossfit.

**Coach**: `/site/admin/box/*` (pasta `src/pages/site-admin/box/`)
- `BoxTurmas.tsx`: criar turmas e adicionar ou remover alunos.
- `BoxProgramacao.tsx`: semana em grade, editor de WOD e aplicação de preset.
- `BoxResultados.tsx`: resultados por dia e turma.
- `SiteAdminLayout.tsx`: grupo de menu "Box" só para crossfit.
- `App.tsx`: novas rotas, sem mudar as existentes.
- Lógica: `src/hooks/use-box.ts` (React Query) e `src/lib/box-wod.ts` (formatos, ordenação do ranking e regras do cronômetro).
- Testes: `src/test/box-wod.test.ts` (ordenação do ranking, contagem regressiva do AMRAP e progressiva do For Time com time cap).

## Etapa 5: dados de teste
Uma Edge Function de uso único (`seed-box-test`), no mesmo modelo usado no CT de lutas. Ela cria:
- o tenant "Box Alphacoach" (`box-alphacoach`, crossfit, `vertical_manual = true`, aprovado, parceiro);
- o coach `boxalphacoach@coach.app` e o aluno "Aluno Teste Box" `boxaluno@coach.app`, ambos com senha `box2026`, além dos perfis e papéis;
- a turma "Turma 6h", com o aluno, e um WOD de exemplo para hoje (AMRAP 12 min com versões Rx e Scaled).

Ela precisa da chave de serviço configurada nas funções do Supabase. Se ela não estiver lá, aviso antes.

## Ordem
1 → 2 → 3 → 4 → 5. Depois, teste completo com as contas de teste: o coach publica o WOD, o aluno lança o resultado e o ranking aparece.

## Observações
- Os apps das lojas precisam de uma nova versão para mostrar as telas novas. As mudanças no banco valem na hora.
- Suposição: o aluno do Box continua usando a dieta e o restante do app como hoje. Só a tela de treino muda.
