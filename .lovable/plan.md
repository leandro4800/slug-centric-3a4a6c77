# Ícones nativos + modelo multi-tenant

## Resposta direta sobre os tenants

**Os tenants NÃO precisam fazer nada.** O app nativo é UM SÓ — "AlphaCoach" — publicado por você na App Store e Google Play. Cada coach (tenant) é apenas um slug dentro do mesmo app, exatamente como funciona hoje na web:

- Aluno baixa "AlphaCoach" da loja
- Faz login → o app detecta o tenant do usuário (via slug/perfil)
- BrandingProvider aplica cores e logo do coach
- SplashScreen React mostra a logo do tenant correto

Ou seja: **ícone da loja = AlphaCoach** (sua marca master). A marca do coach aparece DENTRO do app (splash React + tema + logo nas telas), que já está 100% funcionando.

> Publicar um app nativo POR tenant exigiria: conta Apple Developer separada por coach, build separado, revisão da Apple/Google por coach, manutenção N×. Inviável. O modelo correto é **single-app white-label dinâmico** — que é justamente como o projeto já está arquitetado.

## O que vou gerar (etapa nativa AlphaCoach)

### 1. Configurar `@capacitor/assets`
- Adicionar `@capacitor/assets` como devDependency
- Criar pasta `resources/` com:
  - `icon.png` (1024×1024, logo AlphaCoach sobre fundo preto/vermelho Netflix)
  - `splash.png` (2732×2732, logo AlphaCoach centralizada sobre preto)
  - `splash-dark.png` (idem, para dark mode)
- Adicionar script `npm run cap:assets` que roda `npx capacitor-assets generate`

### 2. Gerar as imagens base
Usar imagegen para criar:
- `resources/icon.png` — símbolo AlphaCoach (a definir: letra "A" estilizada vermelha sobre preto, ou logo existente se houver)
- `resources/splash.png` — logo AlphaCoach centralizada sobre fundo preto sólido

### 3. Documentar no README
Bloco "Build nativo" explicando:
```
npm install
npm run cap:assets        # gera todos os ícones/splash iOS+Android
npx cap add ios|android   # primeira vez
npm run build && npx cap sync
npx cap run ios|android
```

### 4. (Opcional) Manter splash nativo neutro
O splash nativo continua simples (logo AlphaCoach sobre preto, 600ms) e o splash REACT por tenant assume — garantindo que cada coach veja a SUA logo após o boot, sem precisar de build separado.

## O que você precisa decidir

Antes de gerar as imagens, preciso saber:
1. Você já tem um logo/símbolo AlphaCoach pronto (arquivo)? Ou quero que eu gere um do zero?
2. Cor de fundo do ícone da loja: **preto puro** (#000) com símbolo vermelho Netflix, ou **vermelho Netflix** (#E50914) com símbolo branco?

Se preferir, eu sigo com o default: **fundo preto + "A" estilizada em vermelho Netflix + acento branco**, alinhado com a identidade master que já está no projeto.

## Arquivos que serão criados/alterados

- `package.json` — devDep `@capacitor/assets` + script
- `resources/icon.png` (novo, gerado via imagegen)
- `resources/splash.png` (novo, gerado via imagegen)
- `resources/splash-dark.png` (novo)
- `README.md` — seção build nativo
- `capacitor.config.ts` — sem mudança (já está pronto)

Nenhuma alteração em código de runtime, branding ou tenants.
