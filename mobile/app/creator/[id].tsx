import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import type { User } from '@nexanft/contracts';
import { request } from '../../services/api';
import { NFTGrid } from '../../features/marketplace/NFTGrid';
import {
  ScreenContainer,
  Avatar,
  Heading,
  Copy,
  LoadingIndicator,
  ErrorState,
} from '../../components/ui';
import { errorMessage } from '../../services/errors';
export default function Creator() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({
    queryKey: ['creator', id],
    queryFn: ({ signal }) => request<User>(`/users/${id}`, { signal }),
  });
  if (q.isPending)
    return (
      <ScreenContainer>
        <LoadingIndicator />
      </ScreenContainer>
    );
  if (q.isError)
    return (
      <ScreenContainer>
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      </ScreenContainer>
    );
  const user = q.data.data;
  return (
    <ScreenContainer>
      <NFTGrid
        path={`/users/${id}/nfts`}
        filters={{ mode: 'created' }}
        header={
          <View style={{ gap: 16, paddingBottom: 24 }}>
            <Avatar uri={user.avatarUrl} name={user.fullName} size={90} />
            <Heading>{user.fullName}</Heading>
            <Copy muted>
              @{user.username} · Joined {new Date(user.createdAt).toLocaleDateString()}
            </Copy>
            <Copy>{user.bio || 'Every artist starts with a blank canvas.'}</Copy>
            <Heading small>Created works</Heading>
          </View>
        }
      />
    </ScreenContainer>
  );
}
