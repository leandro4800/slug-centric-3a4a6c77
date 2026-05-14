import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Para gerar o build que vai pras lojas (App Store / Play Store):
 *   1. Defina CAP_ENV=production (ou rode `npm run build` sem a var CAP_DEV)
 *   2. `npm run build && npx cap sync`
 *
 * Para testar com hot-reload apontando pro preview do Lovable:
 *   - Deixe CAP_DEV=1 ao rodar `npx cap sync` e `npx cap run ios|android`
 */
// Só ativa live-reload se estiver explicitamente em desenvolvimento local
const isDev = process.env.NODE_ENV === 'development' || process.env.CAP_DEV === '1';

const config: CapacitorConfig = {
  appId: 'app.alphacoach.prod', // ID mais genérico/limpo para a Play Store se desejar, mas mantendo o atual por segurança se já estiver publicado
  appName: 'AlphaCoach',
  webDir: 'dist',
  ...(isDev && {
    server: {
      url: 'https://164775dd-51cd-4aab-8398-20f1eeab0a23.lovableproject.com?forceHideBadge=true',
      cleartext: true,
    },
  }),
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#000000',
  },
  plugins: {
    SplashScreen: {
      // Splash NATIVO neutro (AlphaCoach) — some rapidamente
      // para o splash REACT por tenant assumir dentro do app.
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
