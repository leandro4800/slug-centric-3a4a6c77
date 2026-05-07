# AlphaCoach

Plataforma multi-tenant para coaches e alunos.

## Build nativo (iOS / Android)

O app nativo é **único** ("AlphaCoach") — multi-tenant por dentro. Cada coach é um slug; o branding (cores + logo + splash) é aplicado em runtime pelo `BrandingProvider`. Tenants **não** publicam apps próprios.

### Passo a passo (rodar fora do Lovable)

```bash
# 1. Export to GitHub → git pull no seu Mac/PC
npm install

# 2. Gerar ícones e splash nativos a partir de resources/
npm run cap:assets

# 3. Adicionar plataformas (apenas na primeira vez)
npx cap add ios
npx cap add android

# 4. Build + sync (sempre que houver mudança no código web)
npm run build && npx cap sync

# 5. Rodar
npx cap run ios       # Mac + Xcode
npx cap run android   # Android Studio
```

### Hot-reload no preview Lovable

```bash
CAP_DEV=1 npx cap sync
CAP_DEV=1 npx cap run ios   # ou android
```

### Branding nativo

- `resources/icon.png` (1024×1024) — ícone master AlphaCoach
- `resources/splash.png` / `splash-dark.png` (1920×1920) — splash master
- Splash nativo é curto (600ms) sobre fundo preto; o splash React por tenant assume em seguida com a logo do coach.
