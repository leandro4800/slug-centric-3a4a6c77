import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Para gerar o build que vai pras lojas (App Store / Play Store):
 *   1. Defina CAP_ENV=production (ou rode `npm run build` sem a var CAP_DEV)
 *   2. `npm run build && npx cap sync`
 *
 * Para testar com hot-reload apontando pro preview do Lovable:
 *   - Deixe CAP_DEV=1 ao rodar `npx cap sync` e `npx cap run ios|android`
 */
const isDev = process.env.CAP_DEV === '1';

const config: CapacitorConfig = {
  appId: 'app.lovable.164775dd51cd4aab839820f1eeab0a23',
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
};

export default config;
