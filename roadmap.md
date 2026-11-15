# Correção de conclusão de treino
## Painel do atleta
- [x] Treino e evolução reunidos em Métricas e evolução, carta/avatar gerado e redefinição de senha retirados; foto real editável junto ao nome. Nove testes passaram; abas, menu e foto conferidos em prévia isolada sem erros; salvamento com conta real permanece pendente abaixo.
- [x] /atleta usa e-mail/senha existentes e RPC autenticada para resolver o tenant antes de montar o painel; políticas reais de acesso conferidas, sem alterar permissões. Login público e dois testes do guard passaram; sessão real continua pendente abaixo.
- [x] Painel de acompanhamento no visual do coach com volume, cargas por exercício, gráficos e histórico; Comunidade e Abrir app removidos, rotas do app preservadas. Treze testes passaram e prévia isolada conferida em desktop/celular, sem overflow ou erros; build OK.
- [x] Endereço https://alpha-coach.app/atleta na confirmação/cópia de VIP e e-mails de credenciais (cadastro, boas-vindas e reenvio); oito testes passaram e funções implantadas, sem enviar e-mail real.
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

## Seta de voltar e títulos cortados (pedido 04/nov)
- [x] Seta flutuante não aparece mais nas telas que já têm a própria seta; nas demais o topo reserva espaço para ela não cobrir o título. Quatro testes aprovados.
- [x] Palavra "Voltar" retirada de Controle Central, Parceiros, Comunidade e Dojo do CT; comparativo perdeu a linha de voltar duplicada.
- [x] Títulos do cabeçalho sem corte: "MINHA DIETA" e "EVOLUÇÃO" medidos inteiros em 384px; "EVOLUÇÃO…" perdeu as reticências.
- [ ] Conferir com conta real: Supabase externo sem sessão de teste; a conferência visual foi feita em rota temporária já removida.

## Painel "Meu negócio" (pedido 14/nov)
- [x] Webhook: registrar pagamentos pagos, falhos e estornados sem tocar nos eventos atuais (publicado; aguardando venda real para conferir)
- [x] Página "Meu negócio" com resumo, indicadores, receita por produto e lista de alunos com ficha
- [x] Testes das regras de cálculo (10 aprovados)
- [x] Fase 2 (pedido 15/nov): despesas por categoria, fixas, importar planilha (.xlsx/.csv), lucro, margem, CAC, LTV×CAC, retorno da captação, ponto de equilíbrio, receita recorrente, LTV e tempo como aluno/saída/volta na ficha. 20 testes novos.
- [ ] Conferir a página com conta real de coach: bloqueado (Supabase externo sem sessão de teste); conferida com dados de exemplo

## Assistente do Meu negócio (pedido 15/nov)
- [x] "Sumindo" só com 10+ dias sem treinar; "nunca treinaram" separado, só informativo (filtro próprio)
- [x] Alertas diários no banco: sumido 10/20 dias, queda de frequência, pagamento (vencimento e +3 dias), renovação 7 dias; segunda: lucro/saídas em queda e CAC acima do ticket
- [x] Seção Assistente no topo: Chamar (mensagem editável → WhatsApp), Já falei (7 dias fora), Dispensar
- [x] Tela de configuração: ligar/desligar resumo, horário, canais (e-mail/push), tipos
- [x] Resumo da manhã (1 por dia, máx. 5 itens + "+N no painel", sem notificação sem novidade, nada entre 21h e 7h) por e-mail e push — envio real ao CT Alphacoachpro: push entregue, e-mail sem erro
- [x] Mensagem personalizada por IA (mínimo de dados, cota de 30/mês) e "Pergunte ao seu negócio" com funções seguras por tenant
- [x] Risco de cancelamento por regras simples (filtro "Risco de sair")
- [x] Testes das regras (15 novos)
- [ ] Conferir IA e botões com conta real de coach: Supabase externo sem sessão de teste disponível

## Tela própria de despesas (pedido 15/nov)
- [x] Página /site/admin/despesas com gráfico mensal (fixas x avulsas), totais e lançamentos por mês; itens nos menus e link no Meu negócio
- [x] Seção de custos fixos com formulário direto (sem planilha), parar de repetir e apagar
- [ ] Salvar com conta real: mesmo bloqueio de sessão do Supabase externo

## Alunos demo do coach Nelson Junior (pedido 15/nov)
- [x] 10 alunos demo com acesso, perfil, anamnese, treinos copiados de fichas reais e histórico de treinos
- [x] Planos Mensal R$ 600, Trimestral R$ 1.620, Semestral R$ 3.060 e Anual R$ 5.760 (ativos); alunos demo ativos nesses planos e pagamentos recalculados
- [x] Séries registradas em todos os 639 treinos (nenhum treino vazio)
- [x] Dieta publicada, peso semanal, avaliações e check-ins mensais, despesas demo e 3 alertas do assistente; app do aluno Lucas conferido (treino e dieta)
- [ ] Conferir o painel com a conta do Nelson: Supabase externo, sem acesso à senha do coach
