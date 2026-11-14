# Plano: Painel de Gestão do Personal ("Meu negócio")

Regra: somente acrescentar. Nenhuma tabela ou migration nova. Nenhuma tela, função ou handler existente muda de comportamento.

## O que foi conferido antes do plano
- Banco: `pagamentos` (0 linhas), `assinatura_eventos` (93 eventos), `assinaturas.origem` (92 `gratuito` ativas + 1 `stripe` ativa). `valor_liquido_centavos` é gerado como bruto − taxa_cartao − taxa_alpha. `stripe_invoice_id` é único.
- As regras de leitura de `pagamentos`, `assinatura_eventos`, `assinaturas` e `stats_treino_aluno` liberam o dono do tenant e também o admin geral. Por isso toda consulta do painel vai filtrar `tenant_id` explicitamente.
- A coluna de último treino é `stats_treino_aluno.ultimo_treino` (data).
- Webhook atual trata `checkout.session.completed`, `customer.subscription.updated/deleted` e `account.updated`, e usa a API `2025-08-27.basil` com chave de serviço.
- Checkout atual (cobrança na conta da plataforma com repasse):
  - Coach normal: `application_fee_percent` ≈ 10,66% + `transfer_data`.
  - Parceiro: `transfer_data` + `on_behalf_of`, sem taxa da plataforma.
  - Tenant da plataforma: sem repasse.
- Não existe um fluxo pronto de mensagem para um aluno específico. O único WhatsApp que existe hoje compartilha o link de divulgação, sem número de destino. Por isso o botão "Mandar mensagem" fica de fora da ficha.

## Parte A — Webhook do Stripe (só novos cases)
Arquivo alterado: `supabase/functions/stripe-webhook/index.ts`. Os cases e o upsert de `assinaturas` atuais ficam intactos.

1. **`invoice.paid`**
   - Id da assinatura: `invoice.parent.subscription_details.subscription`, com fallback para `invoice.subscription`.
   - Busca a linha em `assinaturas` por `stripe_subscription_id` e copia `tenant_id`, `aluno_id`, `assinatura_id` e `plano_id`.
   - `aluno_nome` vem de `perfis.nome_completo`, `produto_nome` de `planos.nome`, e `produto_tipo` fica `consultoria`.
   - Faz upsert em `pagamentos` (onConflict `stripe_invoice_id`):
     - `status 'pago'`, `origem 'stripe'`
     - `valor_bruto_centavos = amount_paid`, `data_pagamento = status_transitions.paid_at`
     - `stripe_charge_id` e `stripe_payment_intent_id`
   - Se a assinatura não estiver no banco (por exemplo, a da plataforma paga pelo coach), loga e não grava nada.
2. **Taxas**
   - A charge é obtida pelos pagamentos da fatura, com expand de `payment_intent.latest_charge.balance_transaction`.
   - A regra é que o líquido gravado seja exatamente o que o coach recebe:
     - **Coach normal:** taxa_cartao = taxa real do Stripe (`balance_transaction.fee`, limitada ao valor da application fee). taxa_alpha = application fee − taxa_cartao. Líquido = valor cobrado − application fee, que é o valor repassado.
     - **Parceiro:** as duas taxas ficam 0, porque o coach recebe o valor cheio.
     - **Tenant da plataforma:** taxa_cartao = taxa do Stripe e taxa_alpha = 0.
   - Se algo não puder ser lido, grava 0, loga e segue.
3. **`invoice.payment_failed`**
   - Upsert com `status 'pendente'` quando há `next_payment_attempt`; senão, `vencido`.
   - `data_vencimento` = próxima tentativa, ou `due_date`, ou a data da fatura.
   - Nunca sobrescreve um pagamento que já está `pago`, caso os eventos cheguem fora de ordem.
4. **`charge.refunded`**
   - Atualiza para `estornado` o pagamento com o mesmo `stripe_charge_id`. Se não achar, procura pelo `stripe_payment_intent_id`.
5. **Segurança do fluxo**
   - Cada case novo tem seu próprio try/catch, com `console.error` detalhado e checagem de `error` em cada escrita.
   - Um erro nesses cases nunca sobe para o catch geral, então o webhook continua respondendo 200 como hoje.
   - Deploy da função ao final.

**Fica de fora:** aula avulsa (pagamento único, sem fatura). Se quiser registrar no futuro, é outro case.

**Você precisa conferir no painel do Stripe:** o endpoint do webhook tem que estar inscrito em `invoice.paid`, `invoice.payment_failed` e `charge.refunded`. Eu não consigo ver essa configuração daqui.

## Parte B — Página "Meu negócio" (`/site/admin/meu-negocio`)
Visual vermelho/preto/branco do painel. Funciona no celular e no computador. Valores em R$ a partir de centavos, tudo em português, sem novas dependências.

**Seletor de período:** mês atual (padrão), mês anterior, últimos 3, 6 ou 12 meses. O período anterior, usado para comparação, tem o mesmo tamanho.

1. **Resumo**
   - **Receita:** soma do valor bruto dos pagamentos `pago` no período, com variação em % contra o período anterior.
   - **Alunos ativos:** assinaturas `active`/`trialing`, mostrando "X pagantes + Y gratuitos".
   - **Novos / Saíram:** eventos `entrou` e `saiu` no período.
   - **A receber atrasado:** soma dos pagamentos `vencido` e número de alunos.
   - **Previsão do próximo mês:** preço do plano das assinaturas ativas que não são gratuitas e cujo `current_period_end` cai no mês seguinte.
   - **Mini gráfico:** receita dos últimos 12 meses, em barras feitas com a própria biblioteca de gráficos que o projeto já usa, ou em SVG simples se ela não existir.
   - **Aviso:** "N alunos há mais de 10 dias sem treinar", com base em `ultimo_treino` dos alunos ativos. Quem nunca treinou também conta.
   - **Sem pagamentos no período:** aparece a mensagem "Ainda sem vendas no app", mas alunos ativos, gratuitos e sumindo continuam aparecendo.
2. **Indicadores com semáforo** (aparece "—" quando não há base para calcular; só contam alunos pagantes)
   - **Ticket médio:** receita ÷ alunos que pagaram no período.
   - **Retenção:** (ativos pagantes no fim − novos pagantes) ÷ ativos pagantes no início. Verde ≥ 90%, amarelo de 80% a 90%, vermelho < 80%. Os ativos no início e no fim são reconstruídos a partir de `assinatura_eventos`.
   - **Inadimplência:** valor vencido ÷ valor cobrado (pago + vencido) no período. Verde ≤ 3%, amarelo de 3% a 10%, vermelho > 10%.
   - **Permanência média:** média de meses com pagamento `pago` por aluno pagante.
3. **Receita por produto:** pagamentos pagos agrupados por tipo (Consultoria, Treino a distância, Conteúdo, Curso, Comunidade, Outro), com receita, nº de alunos e ticket.
4. **Alunos**
   - Filtros: Ativos / Sumindo (10 dias ou mais sem treino) / Saíram / Voltaram / Gratuitos.
   - Cada aluno tem 12 quadradinhos, um por mês: vermelho = mês com pagamento `pago`. Gratuitos aparecem em cinza e sem valores.
   - Ao tocar no aluno, abre a ficha:
     - aluno desde (primeiro `entrou`)
     - meses pagos, pago no ano e pago no total
     - linha do tempo de entrou / saiu / voltou
     - lista de pagamentos por mês
   - Sem botão "Mandar mensagem", pelo motivo explicado acima.

**Alunos gratuitos** nunca entram em receita, ticket, permanência, inadimplência nem retenção.

## Arquivos
**Criados**
- `src/pages/site-admin/MeuNegocio.tsx`: página e seletor de período.
- `src/components/site-admin/meu-negocio/ResumoCards.tsx`, `Indicadores.tsx`, `ReceitaPorProduto.tsx`, `AlunosLista.tsx`, `AlunoFicha.tsx`, `ReceitaMiniGrafico.tsx`.
- `src/hooks/use-meu-negocio.ts`: consultas com React Query, sempre filtradas pelo `tenant_id` do `useSiteTenant`.
- `src/lib/meu-negocio-metrics.ts`: cálculos puros (períodos, receita, ticket, retenção, inadimplência, permanência, semáforo, formatação em R$).
- `src/test/meu-negocio-metrics.test.ts`: testes das regras de cálculo:
  - limites do semáforo (90/80 e 3/10)
  - gratuitos fora da receita
  - "—" sem base
  - previsão só de não gratuitos

**Alterados (só acréscimo)**
- `src/App.tsx`: nova rota `meu-negocio` dentro de `/site/admin`.
- `src/components/site-admin/SiteAdminSidebar.tsx`: novo item "Meu negócio" na seção Negócio.
- `src/pages/site-admin/SiteAdminLayout.tsx`: mesmo item no menu do celular.
- `supabase/functions/stripe-webhook/index.ts`: três cases novos (Parte A).

**Confirmação:** nenhum arquivo existente muda de comportamento além do menu (item novo), da rota nova e dos cases novos do webhook. Dashboard, Financeiro, Alunos, AdminFaturamento, CoachDashboard e `site-delete-aluno` não são tocados. Despesas ficam para a fase 2.

## Ordem
1. Cálculos puros e testes.
2. Consultas e componentes da página, rota e itens de menu.
3. Cases do webhook e deploy.
4. Verificação: testes, build, página aberta como coach e estado vazio sem vendas.
