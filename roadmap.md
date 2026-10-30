# Correção de conclusão de treino
## Painel do atleta
- [x] Criar /atleta com login existente e destino vinculado à conta, sem alterar o app das lojas.
- [x] Painel com evolução, fotos, perfil e acesso aos recursos existentes, mantendo dados compartilhados.
- [x] Quinze testes passaram; entrada /atleta abre login, resumo e navegação conferidos com dados fictícios em desktop e celular, sem overflow ou erros de execução.
- [ ] Conferir salvamento e leitura com atleta real: Supabase externo sem sessão autenticada disponível; a verificação isolada não comprova esse fluxo.

## Link de divulgação do coach
- [x] Reutilizar exatamente o link de Alunos (https://alpha-coach.app/[slug]) e a lógica de cópia compartilhada, com tenant resolvido pelo dono.
- [x] Link de divulgação no Controle Central e menus do painel, com cópia e envio neutro; app nativo usa folha de compartilhamento sem abrir a landing.
- [x] Nove testes aprovados; tela e cópia conferidas em prévia isolada de coach fictício, desktop e celular 390×844, sem overflow; WhatsApp abre separado na web; build OK.
- [x] Botão de acesso no Controle Central com fundo branco e texto preto; render conferido no navegador (fundo rgb(250,250,250), texto preto).
- [ ] Conferir com coach real e aparelhos iOS/Android: Supabase externo sem sessão gerenciável e sem aparelho nativo disponível; requer nova versão nas lojas.

## Objetivo Força
- [x] Força no cadastro e Editar Perfil do aluno e nos seletores do coach; teste de salvamento e leitura aluno → coach → aluno aprovado, sem alterar os demais dados.
- [ ] Conferir com conta real: Supabase externo sem sessão disponível; fluxo autenticado não verificado.

## Card de compartilhamento
- [x] Arte full separada abaixo do cabeçalho; navegador confirmou título até y=409 e imagem a partir de y=518; prévia e exportação com atleta conferidas em desktop e mobile. Prévia ilustrativa reconstruída a partir do print, não geração autenticada da conta.
- [x] Reforçar zona segura do atleta no prompt e renovar a versão do cache.
- [x] Reduzir título e adicionar faixa escura exclusiva, compartilhada pela prévia e exportação.
- [x] Função implantada; faixa e título conferidos no navegador e exportação 1080×1920, também em largura móvel, com imagem local sem nova geração IA; build OK.

## Conclusão de treino
- [x] Validar dia e séries da sessão exata antes de concluir; impedir sucesso após erro.
- [x] Adicionar acesso direto à aba pendente e recuperação de sessões antigas sem apagar dados.
- [x] Cinco testes da tela aprovados: troca de dias, sexta vazia com quinta antiga, contador desatualizado, retomada após 24h e falha ao salvar.
- [ ] Verificar com uma conta real: bloqueado pela conexão Supabase externa sem sessão de teste disponível; navegador só mostrou a abertura do app.

## Descanso entre séries
- [x] Campo de descanso em segundos por exercício no editor do coach; salvamento e reabertura preservam tempos independentes. Dez testes aprovados e build OK.
- [x] Botão "Descanso" ao lado de "Modo voz" com o tempo definido pelo coach; vibra no fim da contagem.
- [x] Ao tocar, a contagem abre em versão grande na tela, com anel de progresso; "Parar" encerra e "Fechar" mantém a contagem no botão compacto.
- [x] Três testes do botão aprovados; prévia conferida em tela de celular (384×638) antes e depois de fechar.
- [ ] Verificar com conta real: mesmo bloqueio da conclusão de treino (Supabase externo sem sessão de teste).
## Saúde & Lesões (pedido 30/out)
- [x] 1. Protocolo por fases (IA + botão + PDF)
- [ ] 2. Cards por região com perguntas guiadas
- [ ] 3. Histórico por aluno + liberar protocolo ao aluno, visível em Minha Carta (não em Clínica), com fase atual, critérios e sinais de alerta
- [ ] 4. Feedback após concluir treino sobre dor/incômodo enviado ao coach + alertas push; sem botão de dor ou alteração em Clínica
- [ ] 5. Aplicar protocolo no Montar Treino
- [ ] 6. Novas regiões na trava clínica
- [ ] 7. Favoritos e comandos do coach
