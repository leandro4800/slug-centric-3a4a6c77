O usuário deseja adicionar botões para importar dados (Anamnese, Avaliação Física e 7 Dobras) através de arquivos/IA em suas respectivas telas.

### Alterações propostas:

1.  **Tela de Anamnese (`src/pages/aluno/Anamnese.tsx`)**:
    *   Adicionar um botão "Importar Anamnese" ao lado do botão de salvar.
    *   Implementar a lógica de upload de arquivo (imagem ou PDF).
    *   Integrar com a Edge Function `import-with-ai` (especificando `importType: "anamnese"`) para preencher os campos do formulário automaticamente após o processamento.

2.  **Tela de Avaliação Física (`src/pages/admin/AtletaDetalhe.tsx`)**:
    *   Adicionar um botão de importação específico para avaliação física (no cabeçalho ou junto às ações do atleta).
    *   A tela já possui botões de "Importar treino" e "Importar dieta". Adicionaremos "Importar Avaliação".

3.  **Modal de 7 Dobras (`src/components/admin/JacksonPollockCalculator.tsx`)**:
    *   Adicionar um botão de importação dentro do modal.
    *   Permitir que o coach envie uma foto do adipômetro ou de uma ficha de papel para que a IA extraia os valores das 7 dobras.

### Detalhes Técnicos:
*   Utilizaremos o componente `Input type="file"` oculto e `useRef` para acionar o seletor de arquivos.
*   Chamaremos a Edge Function `import-with-ai` via `supabase.functions.invoke`.
*   A IA processará o arquivo e retornará os dados estruturados para preenchimento dos estados dos componentes.

**Nota:** Como a Edge Function `import-with-ai` já parece existir e ser usada para treinos/dietas, apenas estenderemos seu uso para os novos tipos de importação no frontend. Se houver necessidade de ajustes no prompt da IA, faremos isso na função.
