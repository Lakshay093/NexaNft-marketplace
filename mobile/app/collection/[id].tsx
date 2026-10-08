import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Collection } from '@nexanft/contracts';
import { View } from 'react-native';
import { request } from '../../services/api';
import { NFTGrid } from '../../features/marketplace/NFTGrid';
import {
  ScreenContainer,
  Artwork,
  Heading,
  Copy,
  Button,
  LoadingIndicator,
  ErrorState,
} from '../../components/ui';
import { errorMessage } from '../../services/errors';
export default function CollectionDetails() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    router = useRouter();
  const q = useQuery({
    queryKey: ['collection', id],
    queryFn: ({ signal }) => request<Collection>(`/collections/${id}`, { signal }),
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
  const c = q.data.data;
  return (
    <ScreenContainer>
      <NFTGrid
        path={`/collections/${id}/nfts`}
        header={
          <View style={{ gap: 16, paddingBottom: 24 }}>
            <Artwork uri={c.imageUrl} style={{ height: 220, borderRadius: 24 }} />
            <Heading>{c.name}</Heading>
            <Copy muted>
              {c._count?.nfts ?? 0} works · {new Date(c.createdAt).toLocaleDateString()}
            </Copy>
            <Copy>{c.description}</Copy>
            <Button
              title={`By ${c.creator.fullName} ↗`}
              variant="secondary"
              onPress={() => router.push(`/creator/${c.creator.id}`)}
            />
          </View>
        }
      />
    </ScreenContainer>
  );
}
