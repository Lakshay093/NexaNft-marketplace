import { View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@nexanft/contracts';
import { ScreenContainer, Heading, Copy, Avatar, Button } from '../../components/ui';
import { AuthGate } from '../../components/AuthGate';
import { useAuthStore } from '../../store/auth';
import { request } from '../../services/api';
import { sessions } from '../../services/auth';
import { errorMessage } from '../../services/errors';
type Profile = User & { _count: { createdNFTs: number; ownedNFTs: number; favorites: number } };
function Account() {
  const user = useAuthStore((s) => s.user!),
    router = useRouter(),
    cache = useQueryClient(),
    [error, setError] = useState('');
  const q = useQuery({
    queryKey: ['profile', user.id],
    queryFn: () => request<Profile>(`/users/${user.id}`),
  });
  return (
    <ScreenContainer scroll>
      <Avatar uri={user.avatarUrl} name={user.fullName} size={88} />
      <Heading>{user.fullName}</Heading>
      <Copy muted>
        @{user.username} · Joined {new Date(user.createdAt).toLocaleDateString()}
      </Copy>
      <Copy>{user.bio || 'A little space for your story.'}</Copy>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { label: 'Created', value: q.data?.data._count.createdNFTs },
          { label: 'Owned', value: q.data?.data._count.ownedNFTs },
          { label: 'Favorites', value: q.data?.data._count.favorites },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1 }}>
            <Heading small>{stat.value ?? '—'}</Heading>
            <Copy muted>{stat.label}</Copy>
          </View>
        ))}
      </View>
      <Button title="Edit profile" onPress={() => router.push('/edit-profile')} />
      <Button
        title="My owned artwork"
        variant="secondary"
        onPress={() => router.push('/my-nfts')}
      />
      <Button
        title="My created artwork"
        variant="secondary"
        onPress={() => router.push({ pathname: '/my-nfts', params: { mode: 'created' } })}
      />
      <Button
        title="My favorites"
        variant="secondary"
        onPress={() => router.push('/(tabs)/favorites')}
      />
      <Button
        title="Marketplace activity"
        variant="secondary"
        onPress={() => router.push('/activity')}
      />
      <Button
        title="Notifications"
        variant="secondary"
        onPress={() => router.push('/notifications')}
      />
      <Button title="Settings" variant="secondary" onPress={() => router.push('/settings')} />
      {error && <Copy>{error}</Copy>}
      <Button
        title="Sign out"
        variant="danger"
        onPress={() => {
          void sessions
            .logout()
            .catch((e) => setError(errorMessage(e)))
            .finally(() => {
              cache.clear();
              router.replace('/(tabs)');
            });
        }}
      />
    </ScreenContainer>
  );
}
export default function Profile() {
  return (
    <AuthGate>
      <Account />
    </AuthGate>
  );
}
