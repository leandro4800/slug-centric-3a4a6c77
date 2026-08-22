# Tabela de séries e recordes confiáveis

## Objetivo
Redesenhar as séries do `ExerciseCard` como tabela e tornar a detecção de recorde verificável de ponta a ponta, sem alterar a estrutura fixa de 1 aquecimento + 1 ajuste + 3 séries de trabalho.

## Implementação
- Trocar os cards empilhados por uma tabela responsiva com colunas `SÉRIE | ANTERIOR | KG | REPS | ✓`.
- Buscar em `series_executadas` a execução anterior mais recente do mesmo aluno e exercício e exibir, por posição de série, `peso kg × reps`; mostrar `—` quando não houver.
- Inicializar sempre KG e REPS vazios; não preencher com carga anterior nem restaurar valores de outra execução.
- Confirmar cada linha individualmente pelo botão ✓, gravando somente aquela série em `series_executadas` e bloqueando duplicidade durante o envio.
- Manter a medalha apenas em séries de trabalho que superem histórico anterior; aquecimento/ajuste nunca geram recorde.
- Comparar o novo resultado contra um snapshot do histórico obtido antes do insert: volume na mesma posição, maior peso do exercício e maior 1RM do exercício.
- Só marcar recorde quando já existir execução anterior de trabalho; inserir os recordes em `prs`, marcar `series_executadas.is_recorde`, atualizar `recordSlots` e disparar o banner no componente pai.
- Tratar erros de gravação em `prs`/marcação como erro visível, evitando informar sucesso parcial silenciosamente.

## Validação
- Executar teste de lógica para primeira execução, aquecimento/ajuste e segunda execução de trabalho acima do histórico.
- Fazer inserção controlada em `series_executadas` com valor acima do histórico real, validar os valores gerados pelo banco, a decisão de recorde, a linha em `prs` e depois remover os dados de teste.
- Abrir o preview autenticado, confirmar visualmente a tabela, campos vazios, coluna Anterior, botão ✓, medalha na linha correta e banner no topo.
