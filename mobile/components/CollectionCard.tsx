import { Pressable, Text } from 'react-native';
import type { Collection } from '@nexanft/contracts';
import { useRouter } from 'expo-router';
import { Artwork, styles, Copy } from './ui';
import { colors } from '../constants/theme';
export function CollectionCard({ collection }: { collection: Collection }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/collection/${collection.id}`)}
      style={[styles.card, { width: 220 }]}
    >
      <Artwork uri={collection.imageUrl} style={{ height: 140, borderRadius: 14 }} />
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>{collection.name}</Text>
      <Copy muted>
        {collection._count?.nfts ?? 0} works · @{collection.creator.username}
      </Copy>
    </Pressable>
  );
}
