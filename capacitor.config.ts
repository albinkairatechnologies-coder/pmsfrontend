import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kairavcard.pms',
  appName: 'KairaFlow',
  webDir: 'out',
  server: {
    url: 'https://kairavcard.com/pms',
    cleartext: true
  }
};

export default config;

