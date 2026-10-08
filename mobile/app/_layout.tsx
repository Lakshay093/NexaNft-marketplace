import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useAuthStore } from '../store/auth';
import { sessions } from '../services/auth';
import * as SplashScreen from 'expo-splash-screen';
void SplashScreen.preventAutoHideAsync();
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 }, mutations: { retry: false } },
});
let cachedAccount: string | undefined;
sessions.subscribe((session) => {
  if (cachedAccount !== session?.user.id) {
    queryClient.clear();
    cachedAccount = session?.user.id;
  }
});
export default function RootLayout() {
  useEffect(() => {
    void useAuthStore
      .getState()
      .restore()
      .finally(() => SplashScreen.hideAsync());
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          {[
            ['nft/[id]', 'Artwork'],
            ['collection/[id]', 'Collection'],
            ['creator/[id]', 'Creator'],
            ['edit-nft/[id]', 'Edit listing'],
            ['create-collection', 'Create collection'],
            ['collections', 'Collections'],
            ['edit-profile', 'Edit profile'],
            ['my-nfts', 'My works'],
            ['activity', 'Activity'],
            ['notifications', 'Notifications'],
            ['settings', 'Settings'],
            ['search', 'Search'],
            ['reset-password', 'Reset password'],
          ].map(([name, title]) => (
            <Stack.Screen key={name} name={name} options={{ title }} />
          ))}
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
