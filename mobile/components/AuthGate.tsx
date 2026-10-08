import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { EmptyState, ScreenContainer } from './ui';
export function AuthGate({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user),
    router = useRouter();
  return user ? (
    <>{children}</>
  ) : (
    <ScreenContainer>
      <EmptyState
        title="Make it yours"
        description="Sign in to create listings, collect artwork, and save favorites."
        action={{ label: 'Sign in', onPress: () => router.push('/(auth)/login') }}
      />
    </ScreenContainer>
  );
}
