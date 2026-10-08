import { FlatList, View, RefreshControl } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Collection } from '@nexanft/contracts';
import { request } from '../services/api';
import {
  ScreenContainer,
  Heading,
  LoadingIndicator,
  ErrorState,
  EmptyState,
} from '../components/ui';
import { CollectionCard } from '../components/CollectionCard';
import { errorMessage } from '../services/errors';
import { colors } from '../constants/theme';
export default function Collections() {
  const q = useInfiniteQuery({
    queryKey: ['collection-feed'],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<Collection[]>('/collections', { params: { page: pageParam, limit: 20 }, signal }),
    getNextPageParam: (last) =>
      last.pagination && last.pagination.page < last.pagination.pages
        ? last.pagination.page + 1
        : undefined,
  });
  return (
    <ScreenContainer>
      <Heading>Collections</Heading>
      <FlatList
        data={q.data?.pages.flatMap((p) => p.data) ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ gap: 16, paddingBottom: 30 }}
        renderItem={({ item }) => (
          <View style={{ alignItems: 'center' }}>
            <CollectionCard collection={item} />
          </View>
        )}
        ListHeaderComponent={
          q.isPending ? (
            <LoadingIndicator />
          ) : q.isError ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
          ) : null
        }
        ListEmptyComponent={
          !q.isPending && !q.isError ? (
            <EmptyState
              title="A blank canvas"
              description="Creators’ collections will appear here."
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => void q.refetch()}
            tintColor={colors.accent}
          />
        }
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        }}
        ListFooterComponent={q.isFetchingNextPage ? <LoadingIndicator /> : null}
      />
    </ScreenContainer>
  );
}
