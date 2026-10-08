import { FlatList, View, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { categories } from '@nexanft/contracts';
import { ScreenContainer, Heading, Copy, Header, Avatar, Button } from '../../components/ui';
import { NFTGrid } from '../../features/marketplace/NFTGrid';
import { NFTCard } from '../../components/NFTCard';
import { CollectionCard } from '../../components/CollectionCard';
import { CreatorCard } from '../../components/CreatorCard';
import { useNFTs, useCollections, useCreators } from '../../hooks/marketplace';
import { useAuthStore } from '../../store/auth';
import { colors } from '../../constants/theme';
export default function Home() {
  const router = useRouter(),
    user = useAuthStore((s) => s.user),
    trending = useNFTs({ sort: 'popular', status: 'LISTED' }),
    collections = useCollections(),
    creators = useCreators();
  const header = (
    <View style={{ gap: 24, paddingBottom: 24 }}>
      <Header
        title="nexa↗"
        right={
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
          >
            <Avatar uri={user?.avatarUrl} name={user?.fullName ?? 'Nexa'} />
          </Pressable>
        }
      />
      <Copy muted>ART. CULTURE. A LITTLE POSSIBILITY.</Copy>
      <Heading>Discover the{'\n'}extraordinary.</Heading>
      <Pressable
        onPress={() => router.push('/search')}
        style={{ padding: 16, backgroundColor: colors.surface, borderRadius: 14 }}
      >
        <Copy muted>⌕ Search art, creators, collections…</Copy>
      </Pressable>
      <FlatList
        horizontal
        data={[...categories]}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/explore', params: { category: item } })}
            style={{ padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}
          >
            <Copy>{item}</Copy>
          </Pressable>
        )}
      />
      <Header
        title="In the spotlight"
        right={
          <Button
            title="Explore"
            variant="secondary"
            onPress={() => router.push('/(tabs)/explore')}
          />
        }
      />
      <FlatList
        horizontal
        data={trending.data?.data.slice(0, 1) ?? []}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <View style={{ width: 300 }}>
            <NFTCard nft={item} />
          </View>
        )}
      />
      <Header title="Trending now" />
      <FlatList
        horizontal
        data={trending.data?.data ?? []}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 14 }}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <View style={{ width: 205 }}>
            <NFTCard nft={item} />
          </View>
        )}
      />
      <View style={{ backgroundColor: colors.accent, padding: 24, borderRadius: 24, gap: 10 }}>
        <Text style={{ color: colors.bg, fontSize: 26, fontWeight: '800' }}>
          A new world,{'\n'}one creation at a time.
        </Text>
        <Text style={{ color: colors.bg }}>Meet the artists shaping digital culture.</Text>
        <Button
          title="Explore the collection ↗"
          variant="secondary"
          onPress={() => router.push('/collections')}
        />
      </View>
      <Header title="Popular collections" />
      <FlatList
        horizontal
        data={collections.data?.data ?? []}
        contentContainerStyle={{ gap: 14 }}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CollectionCard collection={item} />}
      />
      <Header title="Creators to know" />
      <FlatList
        horizontal
        data={creators.data?.data ?? []}
        contentContainerStyle={{ gap: 14 }}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CreatorCard creator={item} />}
      />
      <Header title="Fresh off the canvas" />
    </View>
  );
  return (
    <ScreenContainer>
      <NFTGrid filters={{ status: 'LISTED' }} header={header} />
    </ScreenContainer>
  );
}
