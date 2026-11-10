# Levantamento do projeto (somente leitura, nenhum código alterado)

## 1. Serviços externos
- Banco e servidor: Supabase.
- Pagamentos: Stripe (assinaturas, Connect para coaches, portal, webhook). Não existe Asaas no código.
- IA: Lovable AI Gateway, com modelos Google Gemini (principal: gemini-2.5-flash; também 2.5-pro, 3-flash, modelos de imagem) e OpenAI (gpt-5-mini, gpt-5.5, text-embedding-3-small para a base de conhecimento).
- Notificações: Firebase Cloud Messaging (FCM).
- E-mail: Resend.
- YouTube (sincronizar vídeos), Instagram/Meta (login, publicar, sincronizar reels).
- Capacitor (Android/iOS): câmera, arquivos, compartilhar, reconhecimento de voz, push do Firebase.

Segredos configurados: FIREBASE_SERVICE_ACCOUNT, LOVABLE_API_KEY, RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
Variáveis do app: VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_DEFAULT_TENANT_SLUG.
Pedidas pelo código mas NÃO configuradas: YOUTUBE_API_KEY, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, INSTAGRAM_OAUTH_STATE_SECRET, META_APP_ID, META_APP_SECRET, META_LOGIN_CONFIG_ID, META_USE_FACEBOOK_INSTAGRAM_LOGIN, COBALT_API_URL, APP_BASE_URL, CARD_IMAGE_MODEL (as duas últimas têm valor padrão).

## 2. GitHub
Não consigo ver a conexão nem a conta/repositório pelas minhas ferramentas. Confira em Configurações do projeto → Git.

## 3. Backend
Projeto Supabase com ID iflgryuemsohurtdaawm. É um Supabase externo (não Lovable Cloud). Não consigo ver em qual conta/e-mail ele está; isso aparece no painel do Supabase.

## 4. Leitura de exames (Alpha Insight / "Clínica")
Escondida na interface: botões comentados no menu inferior e na Home. A tela continua no app e a função analyze-exams ainda existe no servidor.

## 5. Pagamentos
- Cartão: stripe-checkout (aluno → coach) e coach-platform-checkout (assinatura do coach). Ambos aceitam só cartão.
- Pix: não existe hoje. Não há Asaas no código.
- Taxas: plataforma 7,99% sobre o preço do coach; aluno paga +2,99% para cobrir a Stripe (taxa total ≈ 10,66% do valor cobrado; coach recebe ≈ 92,01% do preço). Na assinatura do coach a plataforma absorve 1%.

## 6. Funções de IA (todas pelo Lovable AI Gateway)
Treino: gerar-treino-ia, gerar-planilha-treino, ia-lesoes, calcular-gasto-treino.
Dieta e hormônios: gerar-dieta, generate-hormone-protocol.
Análises: analyze-exams, analyze-posture, analise-evolucao, analise-performance, analisar-metricas-aluno, painel-360-sintese, coach-fotos-evolucao.
Imagens: gerar-card-treino, gerar-avatar-carta, generate-marketing-card, generate-coach-hero.
Outras: import-with-ai, parse-aluno-ia, theme-ai, knowledge-qa e ingest-knowledge (base de conhecimento com embeddings OpenAI).

## 7. Contas em nome de terceiros
Pelo código não dá para saber o dono das contas Stripe, Firebase, Resend e Supabase. Há e-mails pessoais fixos no banco que dão acesso VIP/coach automático (ex.: leonardo.vpereira92, laenderfelip, davidiasrodriguesbermudes, francolenine, pedropassos.he, lafietdesign, brennoalvezx). Vale revisar se ainda devem ter esse acesso.

## 8. Pendências que vejo
- Instagram e YouTube: código pronto, mas sem chaves, então não funcionam.
- Download de vlog depende de COBALT_API_URL, que não está configurado.
- Pix inexistente.
- Logs sem limpeza automática: notification_logs (lembrete roda a cada minuto) e logs de envio de push crescem sem limite.
- Backup: não há rotina própria no código; depende do plano do Supabase externo.
- Alpha Insight escondido, mas a função de exames segue no ar.
- 33 avisos de segurança restantes no banco; proteção contra senhas vazadas desligada.
- seed-alunos-demo e contas de teste (Box Alphacoach) continuam em produção.

Se quiser corrigir algum desses itens, me diga qual e eu monto o plano.
