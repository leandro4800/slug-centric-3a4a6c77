## Objetivo
Após pagar uma aula avulsa, o aluno NÃO deve cair na tela de "Criar Conta". Deve abrir uma página de **agenda do coach** para escolher um horário disponível. O coach precisa de um painel para cadastrar horários de aulas avulsas.

## O que vamos construir

### 1. Banco de dados (nova migração)
Duas tabelas novas:

- **`agenda_aula_avulsa_slots`** — horários que o coach disponibiliza
  - tenant_id, data, hora_inicio, hora_fim, capacidade (default 1), local/link, ativo
- **`agendamentos_aula_avulsa`** — reservas feitas pelos alunos
  - tenant_id, slot_id, nome, email, telefone, stripe_session_id, status (pendente/confirmado/cancelado), token (uuid público para o aluno acessar a tela sem login)

RLS:
- Slots: SELECT público (anyone), INSERT/UPDATE/DELETE só dono do tenant
- Agendamentos: SELECT/UPDATE só por token (edge function) ou dono do tenant; INSERT por edge function

### 2. Edge functions
- **`stripe-checkout`** (alterar): para `type=aula_avulsa`, gravar metadata com tenant_id e mudar `success_url` para `/{slug}/agendar-aula/{token}` (gerar token UUID antes do checkout, criar registro em `agendamentos_aula_avulsa` com status `pendente`).
- **`stripe-webhook`** (alterar): ao receber `checkout.session.completed` para aula avulsa, marcar agendamento como `pago` (ainda sem slot escolhido).
- **`agendar-slot`** (nova): recebe token + slot_id, valida pagamento, vincula slot ao agendamento, decrementa capacidade.

### 3. Painel do coach
Nova página **`/{slug}/admin/agenda-avulsa`** (`AdminAgendaAvulsa.tsx`):
- Botão no `AdminPanel` ("Agenda — Aulas Avulsas")
- Lista os slots futuros com status (vagas / reservados)
- Form para criar slot (data, hora início/fim, capacidade, local)
- Ver lista de alunos agendados em cada slot (nome, email, telefone)

### 4. Tela do aluno (pós-pagamento)
Nova rota pública **`/{slug}/agendar-aula/:token`** (`AgendarAulaAvulsa.tsx`):
- Carrega agendamento pelo token
- Se status = `pago` e sem slot: mostra grade de slots futuros disponíveis → aluno escolhe → chama `agendar-slot`
- Se já tem slot: mostra confirmação ("Sua aula está marcada para X") com dados do coach

## Detalhes técnicos
- Token UUID público (não expõe email/telefone via SELECT — tela usa edge function `get-agendamento` por token).
- Slot esgotado: hidden da lista do aluno.
- Sem necessidade de login do aluno em todo o fluxo de aula avulsa.
- Coach continua tendo acesso via RLS de `owner_user_id`.

## Fora do escopo (avisar ao final)
- Sincronização com Google Calendar/Outlook.
- Reagendamento automático / cancelamento com reembolso.
- Notificações por e-mail/WhatsApp (podemos adicionar depois).

Confirme para eu prosseguir com a migração e implementação.
