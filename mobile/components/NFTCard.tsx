import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { NFT } from '@nexanft/contracts';
import { Artwork, Avatar, PriceDisplay, styles } from './ui';
import { colors } from '../constants/theme';
export const NFTCard = memo(function NFTCard({ nft }: { nft: NFT }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${nft.name}`}
      onPress={() => router.push(`/nft/${nft.id}`)}
      style={[styles.card, { flex: 1 }]}
    >
      <Artwork uri={nft.imageUrl} style={{ width: '100%', aspectRatio: 1, borderRadius: 14 }} />
      <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
        {nft.name}
      </Text>
      <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
        <Avatar uri={nft.creator.avatarUrl} name={nft.creator.username} size={22} />
        <Text numberOfLines={1} style={{ fontSize: 11, color: colors.muted, flex: 1 }}>
          @{nft.creator.username}
        </Text>
      </View>
      <PriceDisplay price={nft.price} />
      <Text style={{ fontSize: 11, color: colors.muted }}>
        {nft.status} · ♡ {nft.likesCount}
      </Text>
    </Pressable>
  );
});
