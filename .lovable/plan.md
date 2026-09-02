# Cadastro manual de aluno → convite (lead) em vez de conta criada

## (a) Tabela de leads

Nova tabela `public.alunos_pendentes` (nome existente `leads` tem só 3 colunas e é genérica/pública — não serve).

Colunas:
- `id uuid pk default gen_random_uuid()`
- `tenant_id uuid not null` (ref tenants)
- `nome text not null`
- `email text not null` (guardado normalizado em minúsculas)
- `telefone text null`
- `plano_id uuid null` (ref planos, plano sugerido pelo coach)
- `status text not null default 'convidado'` — valores: `convidado`, `convertido`, `cancelado`
- `convite_enviado_em timestamptz null`
- `convertido_em timestamptz null`
- `user_id uuid null` (preenchido na conversão)
- `created_at` / `updated_at` (trigger de updated_at)
- `unique (tenant_id, lower(email))` → recadastrar o mesmo e-mail apenas reenvia o convite (upsert), não duplica

Acesso:
- GRANTs para `authenticated` (leitura/escrita) e `service_role` (tudo). Sem `anon`.
- RLS: coach/admin do tenant pode ver e gerenciar (`has_role(auth.uid(),'coach',tenant_id)` ou owner do tenant); edge functions usam service_role.

## (b) Criação do usuário no webhook sem quebrar pagamento

No `stripe-webhook`, dentro de `checkout.session.completed` (ramo de assinatura, depois de resolver `tenant_id`), o bloco atual "resolve aluno_id pelo email" ganha um fallback:

1. Se `resolvedAlunoId` continua nulo e existe `customerEmail`:
   - `admin.auth.admin.createUser({ email, password: <uuid aleatório>, email_confirm: true, user_metadata: { tenant_id } })`
   - Se o create falhar com "already registered" (corrida), buscar o usuário por e-mail via `listUsers`/`perfis` e seguir.
2. Upsert em `perfis` (id, email, nome vindo do lead ou de `customer_details.name`, tenant_id) e upsert em `user_roles` (`aluno`, tenant_id) — mesmos onConflict já usados no `site-create-aluno`.
3. Só então o upsert em `assinaturas` (código atual, inalterado).
4. Marcar o lead: `alunos_pendentes` → `status='convertido'`, `convertido_em=now()`, `user_id`.
5. Disparar o e-mail de boas-vindas com **link de definição de senha** gerado por `admin.generateLink({ type: 'recovery', email })` (ou `type:'invite'` para usuário recém-criado), enviado pelo Resend com o mesmo remetente/visual de hoje. Nada de senha em texto puro.

Regras de segurança do fluxo de pagamento:
- Tudo isso fica **dentro de try/catch isolados**: qualquer falha em criar usuário/enviar e-mail é logada mas **não** pode derrubar a resposta 200 do webhook nem impedir a gravação da assinatura. Ordem: assinatura primeiro se `resolvedAlunoId` já existir; para o caso novo, criação do usuário é pré-requisito do `aluno_id`, então em caso de falha grava-se a assinatura com `aluno_id` nulo (como já acontece hoje) e loga-se para reprocessamento.
- Idempotência: webhook pode repetir o mesmo evento → todas as operações são upsert/`maybeSingle`, e a criação de usuário é precedida de busca por `perfis`.
- Ramos `platform_subscription` e `aula_avulsa` não são tocados.

## Demais mudanças

- `site-create-aluno`: mantém 100% o caminho atual para `is_partner=true` e para os e-mails VIP hardcoded. Para os demais, passa a apenas gravar/atualizar o lead em `alunos_pendentes` e enviar o e-mail de convite ("Seu coach te convidou para {tenant.nome} — escolha seu plano") com link `https://alpha-coach.app/{slug}` + `?plano={plano_id}` quando houver plano. Retorna `{ ok: true, modo: 'convite' }`.
- `TenantLanding.tsx`: passa a ler `?plano=<id>`, rolar até a seção de planos e destacar o plano indicado (mudança visual pequena; nenhum efeito se o param não vier).
- `NovoAluno.tsx`: texto/confirmação passa a dizer "convite enviado — o aluno finaliza pagando na landing", sem exibir senha.
- `Alunos.tsx`: além dos alunos com conta, lista os leads `status='convidado'` com badge "Aguardando pagamento", com ação de reenviar convite. Alunos com conta continuam como hoje (ativo / sem assinatura).

## (c) Riscos

1. **Webhook em produção**: qualquer exceção não tratada no novo bloco faria o Stripe reenviar o evento. Mitigado com try/catch por etapa + logs; a gravação da assinatura nunca depende do envio de e-mail.
2. **Divergência de e-mail**: se o aluno pagar na landing com um e-mail diferente do que o coach cadastrou, o lead não é casado e permanece "aguardando pagamento" — o coach precisará remover manualmente. Aceitável; posso adicionar um botão "arquivar".
3. **Aluno que já tem conta em outro tenant**: continua funcionando (perfil existe, só ganha a role no tenant novo), mas `perfis.tenant_id` não pode ser sobrescrito se ele for dono de outro tenant — mesma guarda que já existe em `site-create-aluno` precisa ser replicada no webhook.
4. **Perda temporária de fluxo**: coaches não-parceiros acostumados a "criar aluno e mandar senha" perdem esse atalho — é o objetivo, mas exige comunicação.
5. **generateLink**: depende de o template de recovery/invite do Supabase estar coerente com o domínio; se falhar, cai no fallback de e-mail apontando para "Esqueci minha senha" na tela de login.
6. **Leads não convertidos** acumulam dados pessoais no banco — recomendo expurgo/arquivamento após N dias.
