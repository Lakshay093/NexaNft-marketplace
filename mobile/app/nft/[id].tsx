import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Share, Pressable, View } from 'react-native';
import type { NFT } from '@nexanft/contracts';
import { request } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { FavoriteButton } from '../../components/FavoriteButton';
import { ListingActions } from '../../features/listings/ListingActions';
import { errorMessage } from '../../services/errors';
import {
  ScreenContainer,
  Artwork,
  Heading,
  Copy,
  PriceDisplay,
  Avatar,
  Button,
  LoadingIndicator,
  ErrorState,
  Header,
  styles,
} from '../../components/ui';
export default function NFTDetails() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    router = useRouter(),
    user = useAuthStore((s) => s.user);
  const query = useQuery({
    queryKey: ['nft', id, user?.id],
    queryFn: ({ signal }) => request<NFT>(`/nfts/${id}`, { signal }),
  });
  if (query.isPending)
    return (
      <ScreenContainer>
        <LoadingIndicator />
      </ScreenContainer>
    );
  if (query.isError)
    return (
      <ScreenContainer>
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      </ScreenContainer>
    );
  const nft = query.data.data;
  return (
    <ScreenContainer scroll>
      <Artwork uri={nft.imageUrl} style={{ width: '100%', aspectRatio: 1, borderRadius: 26 }} />
      <Copy muted>
        {nft.category.toUpperCase()} / {nft.status}
      </Copy>
      <Heading>{nft.name}</Heading>
      <View style={styles.card}>
        <Header title="Current price" />
        <PriceDisplay price={nft.price} />
        <Copy muted>ETH denomination only. No payment or blockchain transaction is connected.</Copy>
      </View>
      <ListingActions nft={nft} />
      <FavoriteButton nft={nft} />
      <Header title="The story" />
      <Copy>{nft.description}</Copy>
      <View style={styles.row}>
        <Copy muted>♡ {nft.likesCount} favorites</Copy>
        <Copy muted>◉ {nft.viewsCount} views</Copy>
      </View>
      {[
        { label: 'Created by', person: nft.creator },
        { label: 'Platform owner', person: nft.owner },
      ].map(({ label, person }) => (
        <Pressable
          key={label}
          onPress={() => router.push(`/creator/${person.id}`)}
          style={[styles.card, styles.row]}
        >
          <Avatar uri={person.avatarUrl} name={person.fullName} />
          <View style={{ flex: 1 }}>
            <Copy muted>{label}</Copy>
            <Copy>{person.fullName} ↗</Copy>
          </View>
        </Pressable>
      ))}
      {nft.collection && (
        <Button
          title={`Collection: ${nft.collection.name} ↗`}
          variant="secondary"
          onPress={() => router.push(`/collection/${nft.collectionId}`)}
        />
      )}
      <Copy muted>Created {new Date(nft.createdAt).toLocaleDateString()}</Copy>
      <Button
        title="Share artwork"
        variant="secondary"
        onPress={() =>
          void Share.share({
            message: `Discover ${nft.name} by @${nft.creator.username} on NexaNFT. nexanft://nft/${nft.id}`,
          })
        }
      />
    </ScreenContainer>
  );
}
