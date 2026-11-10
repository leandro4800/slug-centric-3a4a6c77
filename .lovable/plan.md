# Plano: cobrança direta na conta do coach (sem passar pelo saldo da plataforma)

Nada será alterado até você aprovar. Pix fica fora deste plano.

## O que existe hoje (conferido no código e no banco)
- `stripe-checkout`: a cobrança é criada na conta da PLATAFORMA e repassada ao coach (`transfer_data`). Coach normal paga taxa da plataforma (`application_fee`); parceiro (`is_partner`) usa `on_behalf_of` sem taxa; tenant da própria plataforma (`is_platform_owned`) cobra sem repasse.
- Aula avulsa cria o preço na hora; assinatura usa preço criado por `stripe-create-plan` na conta da plataforma.
- Coaches usam contas Connect do tipo **Express**.
- Um único webhook (`STRIPE_WEBHOOK_SECRET`) só escuta eventos da conta da plataforma.
- **Das 91 assinaturas ativas, só 1 é cobrada pelo Stripe** (coach parceiro). As outras 90 são acessos VIP/gratuitos sem cobrança: 54 de parceiros, 32 de tenants da plataforma e 4 de coaches normais. O risco real de migração é bem menor do que parecia.

## 1. Modelo recomendado: cobrança direta (direct charge)
- A cobrança é criada **dentro da conta Connect do coach** (cabeçalho `Stripe-Account`). O valor entra direto no saldo do coach e só a taxa (`application_fee_amount` na aula avulsa, `application_fee_percent` na assinatura) vai para a plataforma.
- Alternativas avaliadas:
  - Cobrança com repasse + `on_behalf_of`: o coach aparece como vendedor, mas o dinheiro **continua passando** pelo saldo da plataforma. Não resolve.
  - Separate charges and transfers: também passa pela plataforma. Não resolve.
  - Conclusão: só a cobrança direta garante que o valor do coach nunca entre no saldo da plataforma.
- Atenção com Express: funciona com cobrança direta, mas o Stripe recomenda contas Standard. Com Express, a plataforma continua responsável por saldo negativo do coach (estornos e contestações) e paga a mensalidade Connect por conta ativa. Não é obrigatório trocar o tipo de conta; é um ponto de decisão.

## 2. O que muda em cada função
- **stripe-checkout**: cria a sessão com `stripeAccount: conta_do_coach`. Remove `transfer_data` e `on_behalf_of`. Mantém a taxa. O cliente Stripe passa a ser criado na conta do coach. Cupons (`allow_promotion_codes`) só valem se existirem na conta do coach; os cupons atuais da plataforma deixam de funcionar.
- **stripe-create-plan**: produto e preço precisam existir **na conta do coach**. Novas colunas para guardar o preço "direto" sem apagar o preço antigo, por exemplo `stripe_price_id_direct` e `stripe_account_id`. O plano precisa ser recriado na conta do coach na primeira venda (sob demanda) ou num botão do painel.
- **stripe-webhook**: criar um segundo endpoint no Stripe para "eventos de contas conectadas", com novo segredo `STRIPE_CONNECT_WEBHOOK_SECRET`. A função aceita os dois segredos e lê `event.account`. Ao consultar a assinatura (`subscriptions.retrieve`), passa `stripeAccount: event.account`. Em `assinaturas`, guardar `stripe_account_id` para saber onde a assinatura vive. Os eventos atuais continuam sendo tratados.
- **stripe-portal**: abrir o portal com `stripeAccount` quando a assinatura do aluno for direta. Cada conta de coach precisa de uma configuração do portal, que pode ser criada pela API. O portal da assinatura do coach com a plataforma (`coach_platform_subscriptions`) fica igual.
- **stripe-connect-status / onboard**: além de `charges_enabled`, conferir se a capacidade `card_payments` está ativa na conta do coach. Isso é obrigatório para cobrança direta.
- **coach-platform-checkout** (o coach paga a plataforma): não muda.

## 3. Taxas: conta nova com exemplo de R$ 100
Premissa a confirmar no contrato Stripe: cartão nacional com cerca de 3,99% + R$ 0,39 por cobrança.

Hoje (coach normal):
- Aluno paga R$ 102,99 (com acréscimo de 2,99%).
- Coach recebe R$ 92,01.
- Plataforma recebe R$ 10,98 de taxa e paga cerca de R$ 4,50 ao Stripe. **Líquido: cerca de R$ 6,48.**

Cobrança direta: o Stripe desconta a taxa **do coach**. Opções:
- **A. Taxa da plataforma de 7,99% sobre o preço (R$ 7,99):** aluno paga R$ 102,99; plataforma recebe R$ 7,99 limpos; coach recebe 102,99 − 7,99 − cerca de 4,50 = **cerca de R$ 90,50**. O coach perde cerca de R$ 1,50 em relação a hoje.
- **B. Manter o coach em cerca de R$ 92,01 (recomendado para não mudar o combinado):** taxa da plataforma de cerca de 6,3% do total cobrado (cerca de R$ 6,48). O aluno continua pagando R$ 102,99 e a plataforma recebe o mesmo líquido de hoje. Como a taxa do Stripe varia (cartão estrangeiro, parcela fixa de R$ 0,39), o valor do coach oscila alguns centavos.
- O acréscimo de 2,99% para o aluno pode continuar igual nas duas opções.
- Você escolhe A ou B. O plano implementa a escolha como uma constante única, usada também pela aula avulsa.

## 4. Parceiros e tenants da plataforma
- **Parceiro (`is_partner`)**: cobrança direta **sem taxa da plataforma**. O coach recebe tudo menos a taxa do Stripe, que é o mesmo resultado prático de hoje.
- **Tenant da plataforma (`is_platform_owned`, ex.: alphateam)**: continua cobrando na conta da plataforma, sem Connect. Não muda.

## 5. Assinaturas já ativas
- Recomendação: **não migrar automaticamente**. As existentes continuam no modelo antigo (repasse) até cancelarem. Só novas vendas usam o modelo direto, controlado por um campo por tenant (ex.: `tenants_private.charge_model = 'destination' | 'direct'`). Assim dá para ligar coach por coach.
- Uma assinatura não pode ser "movida" de conta no Stripe. Migrar exige cancelar e recriar, com novo cartão do aluno. Como só existe 1 assinatura cobrada, isso pode ser feito manualmente com aquele aluno, se você quiser.
- Riscos:
  - O webhook deixar de tratar eventos antigos. Mitigação: manter os dois caminhos e testar ambos.
  - Cupons da plataforma pararem de funcionar nas novas vendas.
  - O coach sem `card_payments` ativo não conseguir vender. O checkout bloqueia com mensagem clara.
  - Estornos e contestações saem do saldo do coach. Se ficar negativo, com Express a plataforma cobre.
  - Relatórios: as vendas diretas não aparecem no painel Stripe da plataforma, só a taxa. O app passa a ser a fonte da visão consolidada.
  - O segundo segredo de webhook precisa estar configurado antes de ligar o primeiro coach.

## 6. Testes e reversão
- Usar o modo teste do Stripe com uma chave de teste separada (ex.: `STRIPE_SECRET_KEY_TEST`), usada só quando o tenant for de teste (Box Alphacoach ou um coach de teste).
- Criar uma conta Express de teste e rodar cartão 4242: assinatura, aula avulsa, renovação simulada (test clock), cancelamento pelo portal, estorno e contestação.
- Conferir os saldos: o coach recebe o valor, a plataforma só a taxa.
- Conferir que a assinatura antiga (modelo repasse) continua recebendo eventos.
- Ligar em produção para 1 coach parceiro primeiro e depois ampliar.
- Reversão: voltar `charge_model` do tenant para `destination`. As novas vendas voltam ao modelo antigo na hora. As assinaturas diretas já criadas continuam funcionando, porque o webhook trata os dois tipos. Nenhuma tabela é apagada; só são adicionadas colunas.

## 7. Pontos para confirmar com o contador
- Se a plataforma passa a emitir nota só sobre a taxa (application fee) e o coach emite nota ao aluno pelo valor cheio.
- Se a cobrança direta tira de fato a receita do coach da base da plataforma (intermediação vs. revenda), considerando que a plataforma ainda define o preço com acréscimo.
- Como tratar o acréscimo de 2,99% pago pelo aluno: receita do coach ou repasse de custo.
- Responsabilidade por estornos e contestações que a plataforma cobrir (contas Express).
- Retenções (ISS/IR) sobre a taxa da plataforma e se o coach pessoa física precisa de CNPJ ou MEI para receber direto.
- Se as assinaturas antigas, que ficam no modelo de repasse, precisam de tratamento diferente até acabarem.

## Detalhes técnicos (ordem de implementação)
1. Migração: `tenants_private.charge_model` (padrão `destination`), `planos.stripe_price_id_direct`, `assinaturas.stripe_account_id`.
2. `stripe-create-plan` e `stripe-checkout` com caminho direto controlado pelo campo.
3. `stripe-webhook` com dois segredos e `event.account`; `stripe-portal` com `stripeAccount`.
4. `stripe-connect-status` checando `card_payments`.
5. Testes em modo teste, depois ligar 1 coach.
