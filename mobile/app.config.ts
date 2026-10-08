import type { ExpoConfig } from 'expo/config';
const productionBuild = ['production', 'cloud'].includes(process.env.EAS_BUILD_PROFILE ?? '');
if (productionBuild && !process.env.EXPO_PUBLIC_API_URL?.startsWith('https://'))
  throw new Error('Production builds require an HTTPS EXPO_PUBLIC_API_URL');
const config: ExpoConfig = {
  name: 'NexaNFT',
  slug: 'nexanft-marketplace',
  owner: 'lakshaydhimans-team',
  version: '1.0.0',
  scheme: 'nexanft',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  icon: './assets/icon.png',
  splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#101014' },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.nexanft.marketplace',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: !productionBuild,
        NSAllowsLocalNetworking: !productionBuild,
      },
      ...(!productionBuild
        ? {
            NSLocalNetworkUsageDescription:
              'Connect to the marketplace server on your Wi-Fi during testing.',
          }
        : {}),
    },
  },
  android: {
    package: 'com.nexanft.marketplace',
    adaptiveIcon: { foregroundImage: './assets/icon.png', backgroundColor: '#101014' },
  },
  web: { bundler: 'metro', output: 'single', favicon: './assets/icon.png' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-image-picker',
      { photosPermission: 'NexaNFT uses your photos to upload artwork and profile images.' },
    ],
    'expo-notifications',
    ['expo-build-properties', { android: { usesCleartextTraffic: !productionBuild } }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    author: 'Lakshay Dhiman',
    eas: { projectId: process.env.EAS_PROJECT_ID || '78458ae6-9eb7-4b49-b6d6-9093e14bdb7f' },
  },
};
export default config;
