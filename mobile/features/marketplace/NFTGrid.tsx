import { FlatList, View, RefreshControl, useWindowDimensions } from 'react-native';
import type { SearchFilters } from '@nexanft/contracts';
import type { ReactNode } from 'react';
import { useNFTFeed } from '../../hooks/marketplace';
import { NFTCard } from '../../components/NFTCard';
import { EmptyState, ErrorState, LoadingIndicator } from '../../components/ui';
import { errorMessage } from '../../services/errors';
import { colors } from '../../constants/theme';
import { SkeletonLoader } from '../../components/SkeletonLoader';
export function NFTGrid({
  filters = {},
  path = '/nfts',
  header,
}: {
  filters?: SearchFilters;
  path?: string;
  header?: ReactNode;
}) {
  const query = useNFTFeed(filters, path),
    { width } = useWindowDimensions(),
    columns = width > 800 ? 3 : 2;
  const rows = query.data?.pages.flatMap((p) => p.data) ?? [];
  return (
    <FlatList
      key={columns}
      data={rows}
      numColumns={columns}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 30, gap: 14 }}
      columnWrapperStyle={{ gap: 14 }}
      ListHeaderComponent={
        <>
          {header}
          {query.isPending && <SkeletonLoader />}
          {query.isError && (
            <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          )}
        </>
      }
      ListEmptyComponent={
        !query.isPending && !query.isError ? (
          <EmptyState
            title="Nothing here yet"
            description="Try another search, or create something extraordinary."
          />
        ) : null
      }
      renderItem={({ item }) => (
        <View style={{ width: (width - 40 - 14 * (columns - 1)) / columns }}>
          <NFTCard nft={item} />
        </View>
      )}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          tintColor={colors.accent}
        />
      }
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      ListFooterComponent={query.isFetchingNextPage ? <LoadingIndicator /> : null}
      removeClippedSubviews
      initialNumToRender={8}
      windowSize={7}
    />
  );
}
