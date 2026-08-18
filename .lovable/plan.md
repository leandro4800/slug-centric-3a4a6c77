# Vínculo de exercício por ID (fim do match por texto)

## Diagnóstico do que existe hoje (verificado)

- `treinos_prescritos` (1.118 linhas; 168 com `video_url` preenchido) guarda só o **texto livre** em `exercicio`. Não há FK para a biblioteca.
- `referencia_exercicios` tem 172 linhas (tenant + globais com `tenant_id NULL`).
- Existem **três** camadas de match por texto rodando na exibição, todas fontes de vídeo errado:
  1. `src/pages/aluno/Treino.tsx` (linhas ~195-256): tokeniza o nome, descarta palavras "genéricas" (barra, halter, máquina, cabo, banco...) e escolhe o registro com **maior sobreposição de tokens** — basta 1 token em comum. É exatamente o que faz "Crucifixo na máquina" cair no vídeo de "Crucifixo com halter".
  2. `src/components/aluno/ExerciseCard.tsx` (linhas ~115-145): fallback próprio com `ilike` no nome quando não veio `video_url`.
  3. `src/lib/mcp/tools/set_athlete_workout.ts`: `lookupVideo()` grava `video_url` por `ilike '%nome%'` na hora de salvar (via Claude/MCP).
- Importação PDF: `supabase/functions/import-with-ai/index.ts` (linhas ~651-665) **apaga todo o treino do aluno** e insere as linhas com `ex.nome` cru, sem vídeo e sem qualquer conferência com a biblioteca.
- `pg_trgm` **não está instalado** no banco (extensões: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, vault, pg_cron, pg_net). Será habilitado na migração.
- RLS: `treinos_prescritos` tem `treinos_select` + `treinos_manage_coach`; `referencia_exercicios` tem select público-por-tenant e escrita do coach/admin. Adicionar uma coluna não muda nada nessas policies.

## Riscos que você deve saber antes

1. **`historico_cargas` é ligado por texto** (`exercicio_nome`), não por ID. Portanto o plano **não vai renomear** o campo `exercicio` — o texto extraído do PDF continua sendo gravado como está. A FK entra como informação adicional. Se um dia normalizarmos o nome, o histórico de cargas do aluno se desliga.
2. **A reimportação de PDF apaga o treino inteiro do aluno** antes de inserir. Isso já é assim hoje; qualquer vínculo revisado manualmente se perde numa nova importação. Vale confirmar se você quer manter esse comportamento destrutivo.
3. **Desligar o match por texto vai reduzir vídeos exibidos no curto prazo**: treinos antigos sem `video_url` e sem FK passam a aparecer sem vídeo (hoje aparecem com vídeo, às vezes errado). A migração do item 4 recupera só os 168 que já têm `video_url`. Por isso o painel de auditoria (item 3) importa mais do que parece — sugiro fazê-lo junto, não depois.
4. Outras telas que também escrevem/leem exercício por texto e precisam do mesmo tratamento para não reintroduzir o problema: `AdminMontarTreino.tsx` (ExercisePicker), `PrescricaoViewer.tsx`, e as tools MCP (`set_athlete_workout`, `update_athlete_workout`, `update_workout_exercise`).
5. `referencia_videos` e `biblioteca_exercicios` continuam existindo como fontes paralelas de vídeo. O plano elege **`referencia_exercicios` como fonte única** para o vínculo por ID; as outras seguem só como catálogo de consulta do coach.

## Etapa 1 — Vínculo por ID (fonte da verdade)

Migração:
- `ALTER TABLE public.treinos_prescritos ADD COLUMN referencia_exercicio_id uuid REFERENCES public.referencia_exercicios(id) ON DELETE SET NULL;` + índice.
- `CREATE EXTENSION IF NOT EXISTS pg_trgm;` (schema `extensions`) e índice GIN trigram em `referencia_exercicios.nome_exercicio`.
- Função `SECURITY DEFINER` `public.match_referencia_exercicio(_tenant_id uuid, _nome text)` que retorna as melhores correspondências com score de similaridade (normalização: minúsculo, sem acento, sem pontuação/apóstrofo, espaços colapsados), priorizando vídeos do tenant sobre globais.
- Migração de dados: preencher `referencia_exercicio_id` casando `treinos_prescritos.video_url` com `referencia_exercicios.url_video` (normalizando ID do YouTube, não só a URL literal).

Frontend:
- `Treino.tsx`: passa a selecionar `referencia_exercicio_id` e fazer join em `referencia_exercicios` para pegar `url_video`. **Remover** `norm/findBest/resolveVideo/resolveCoach` e o carregamento de todos os refs.
- `ExerciseCard.tsx`: remover o fallback `ilike`; usar apenas o vídeo recebido via props.
- Regra de precedência do vídeo: `video_coach_url` (upload do coach) > vídeo da FK > `video_url` gravado na linha > sem vídeo.

## Etapa 2 — Importação de PDF com vinculação

Em `import-with-ai` (`importType === "treino"`), para cada exercício extraído, antes de inserir:
- chamar `match_referencia_exercicio` com o nome extraído;
- `score >= 0.75` → grava `referencia_exercicio_id` automaticamente;
- `0.5 <= score < 0.75` → insere sem vínculo e devolve na resposta um item `pendencias` com `{ linha_id, nome_pdf, sugestao: { id, nome, url_video }, score }`;
- `score < 0.5` → insere sem vínculo, marcado como `sem_video`.

Resposta da função passa a incluir `revisao: { pendentes: [...], sem_video: [...] }`.

UI pós-importação (em `ImportPlanoIA` / tela de montar treino): modal de revisão listando cada pendência com "Encontramos '<nome da biblioteca>' parecido com '<nome do PDF>' — é o mesmo exercício?" e botões **[Usar este vídeo]** (grava a FK) / **[É um exercício novo]** (marca resolvido sem vínculo). Abaixo, a lista "sem vídeo técnico" com atalho para escolher manualmente na biblioteca.

## Etapa 3 — Painel de auditoria (recomendo junto, não depois)

Nova aba em Videos Técnicos / Montar Treino: lista de exercícios prescritos do tenant sem `referencia_exercicio_id`, agrupados por nome, com contagem de alunos afetados e ação de vincular em lote a um item da biblioteca.

## Etapa 4 — Escritores restantes

Atualizar `set_athlete_workout`, `update_athlete_workout`, `update_workout_exercise` (MCP) e o ExercisePicker do `AdminMontarTreino` para gravarem a FK em vez de (ou além de) `video_url` por `ilike`.

## Detalhes técnicos

- A similaridade usa `similarity()` do pg_trgm sobre nomes normalizados; nada de matching por token solto.
- A função de match é `SECURITY DEFINER` com `search_path = public` e filtra por `tenant_id = _tenant_id OR tenant_id IS NULL`, respeitando `tenants.usar_apenas_meus_videos`.
- Nenhuma policy de RLS muda; a nova coluna herda as policies existentes de `treinos_prescritos`.
- `src/integrations/supabase/types.ts` é regenerado após a migração; o código que usa a coluna vem depois.

## Perguntas em aberto

1. Manter a reimportação de PDF destrutiva (apaga o treino inteiro do aluno)?
2. Fazer o painel de auditoria (etapa 3) no mesmo ciclo, para não deixar treinos antigos sem vídeo?
