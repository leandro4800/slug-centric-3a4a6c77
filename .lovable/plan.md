Para atender ao seu pedido, vou realizar as seguintes alterações:

### 1. Captura de Leads (Email para Simulação)
- Criar uma tela de bloqueio no simulador que solicita o email do usuário.
- O acesso será liberado imediatamente após o preenchimento do email (sem senha).
- Os emails serão salvos automaticamente na tabela `leads` que acabei de criar no banco de dados.

### 2. Atualização de Conteúdo
- Sincronizar as seções do site com o conteúdo da URL informada (funcionalidades, depoimentos, etc.).
- Melhorar a seção do simulador para incluir as telas do aplicativo conforme solicitado.

### Detalhes Técnicos
- **Banco de Dados**: Já criei a tabela `leads` com segurança RLS para permitir inserções anônimas.
- **Frontend**: Vou atualizar o componente `Landing.tsx` para gerenciar o estado do simulador e a validação do lead.
- **Integração**: Usarei o Supabase para persistir os emails capturados.

Vou começar a implementação agora.