import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.164775dd51cd4aab839820f1eeab0a23',
  appName: 'AlphaCoach',
  webDir: 'dist',
  server: {
    url: 'https://164775dd-51cd-4aab-8398-20f1eeab0a23.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#000000',
  },
};

export default config;
