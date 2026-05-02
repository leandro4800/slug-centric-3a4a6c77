Para permitir que o aluno edite seu perfil, anamnese e avaliação física, farei as seguintes alterações:

### Perfil
- Adicionar um estado de edição (`isEditing`) na página `Perfil.tsx`.
- Criar campos de entrada para Nome e Telefone na seção de resumo (já existente ou expandida).
- Implementar a função `handleUpdateProfile` para salvar essas alterações na tabela `perfis`.

### Anamnese
- O componente `Anamnese.tsx` já funciona como um formulário de edição/upsert. Adicionarei um botão de "Minha Anamnese" no perfil que leva a essa página (já existe).

### Avaliação Física
- Criar um novo componente de modal/página para editar a avaliação física mais recente ou adicionar uma nova.
- Implementar lógica para buscar a última avaliação (`avaliacoes_fisicas`) e permitir a edição.

### Resumo das alterações
1. `src/pages/aluno/Perfil.tsx`: Adicionar formulário de edição de dados básicos.
2. `src/pages/aluno/AvaliacaoFisicaEdit.tsx`: Novo componente para gerenciar avaliações físicas.
3. Adicionar rota `/perfil/avaliacoes` se necessário ou integrar ao perfil.

A implementação focará em utilizar os hooks e serviços Supabase existentes, seguindo o design atual.
