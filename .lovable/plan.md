O problema de loop infinito e tela piscando (redirecionamentos sucessivos) geralmente ocorre quando várias rotas ou componentes de proteção tentam redirecionar o usuário ao mesmo tempo para lugares diferentes, ou quando o estado de autenticação demora a estabilizar e os redirecionadores entram em conflito.

### Diagnóstico Técnico:
1.  **Redirecionamentos em Conflito:** No `Login.tsx`, há um `useEffect` pesado que faz redirecionamentos manuais via `window.location.href`. Ao mesmo tempo, o `App.tsx` usa `RequireAuth` e `IndexRedirect` que também podem disparar redirecionamentos.
2.  **`IndexRedirect` Ambíguo:** O componente `IndexRedirect` usa `window.location.href` para a Alphateam, o que recarrega a página inteira. Se o `App.tsx` montar esse componente em rotas como `/index` ou `/`, e ele redirecionar para uma rota que cai de volta nele ou em outro redirecionador, o loop acontece.
3.  **Estado de Carregamento:** O `SplashScreen` e o `AuthContext` têm tempos de carregamento que, se não sincronizados, fazem a tela "piscar" entre o estado de carregamento e a página final.

### Plano de Ação:

#### 1. Unificar a Lógica de Redirecionamento Pós-Login
Remover a lógica complexa de redirecionamento do `Login.tsx` e centralizá-la no `IndexRedirect.tsx` ou em um hook especializado. O `Login.tsx` deve apenas autenticar; o sistema de rotas deve cuidar de onde o usuário deve estar.

#### 2. Estabilizar o `IndexRedirect`
Garantir que o `IndexRedirect` seja o "porto seguro". Ele deve verificar os papéis do usuário e o tenant atual de forma definitiva antes de decidir o destino, evitando redirecionamentos múltiplos.

#### 3. Corrigir o Loop de Navegação
No `App.tsx`, as rotas de raiz (`/`, `/index`) devem apontar para o `IndexRedirect`. Vamos garantir que o `IndexRedirect` não use `window.location.href` a menos que seja estritamente necessário para limpar o estado (como em mudanças de tenant), preferindo o `navigate` do React Router para manter a SPA estável.

#### 4. Ajustar o `RequireAuth`
Garantir que o `RequireAuth` não redirecione para `/login` se o usuário já estiver autenticado mas o tenant ainda estiver carregando.

### Detalhes Técnicos:
- **`src/pages/Login.tsx`:** Limpar o `useEffect` de redirecionamento. Deixar apenas a lógica de voucher/login. Após login bem-sucedido, navegar para `/index` para deixar o `IndexRedirect` resolver.
- **`src/pages/IndexRedirect.tsx`:** Robustecer a detecção de destino. Se o usuário for dono de tenant, vai para `controle`. Se for aluno, vai para `app`.
- **`src/hooks/use-auth.tsx`:** Garantir que `isLoading` reflita corretamente o estado de permissões para evitar que componentes de proteção ajam prematuramente.
- **`src/components/SplashScreen.tsx`:** Garantir que ele cubra a tela até que o redirecionamento inicial esteja decidido.
