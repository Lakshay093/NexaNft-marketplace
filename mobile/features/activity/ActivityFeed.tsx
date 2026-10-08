import { FlatList, Pressable, View, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Activity, Notification } from '@nexanft/contracts';
import { request } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import {
  ScreenContainer,
  Heading,
  Copy,
  Artwork,
  LoadingIndicator,
  EmptyState,
  ErrorState,
  Button,
  styles,
} from '../../components/ui';
import { colors } from '../../constants/theme';
import { errorMessage } from '../../services/errors';
type Entry = Activity | Notification;
export function ActivityFeed({ notifications = false }: { notifications?: boolean }) {
  const user = useAuthStore((s) => s.user),
    router = useRouter(),
    cache = useQueryClient(),
    path = notifications ? '/notifications' : '/activity',
    key = notifications ? 'notifications' : 'activity';
  const q = useInfiniteQuery({
    queryKey: [key, user?.id],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<Entry[]>(path, { params: { page: pageParam, limit: 20 }, signal }),
    getNextPageParam: (last) =>
      last.pagination && last.pagination.page < last.pagination.pages
        ? last.pagination.page + 1
        : undefined,
  });
  const mark = useMutation({
    mutationFn: (id?: string) =>
      request(id ? `/notifications/${id}/read` : '/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['notifications'] }),
  });
  return (
    <ScreenContainer>
      <Heading>{notifications ? 'Your notifications' : 'Around the marketplace'}</Heading>
      {notifications ? (
        <Button
          title="Mark all as read"
          variant="secondary"
          loading={mark.isPending}
          onPress={() => mark.mutate(undefined)}
        />
      ) : (
        <Copy muted>CREATED · UPDATED · UNLISTED · DEMO TRANSFERRED</Copy>
      )}
      {mark.isError && <Copy>{errorMessage(mark.error)}</Copy>}
      <FlatList
        data={q.data?.pages.flatMap((p) => p.data) ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 30 }}
        renderItem={({ item }) => {
          const activity = 'actor' in item;
          return (
            <Pressable
              style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}
              onPress={() => {
                if (activity) router.push(`/nft/${item.nft.id}`);
                else {
                  mark.mutate(item.id);
                  if (item.nftId) router.push(`/nft/${item.nftId}`);
                }
              }}
            >
              {activity && (
                <Artwork
                  uri={item.nft.imageUrl}
                  style={{ width: 64, height: 64, borderRadius: 12 }}
                />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Copy>
                  {activity
                    ? `${item.actor.fullName} · ${item.type === 'TRANSFERRED' ? 'DEMO TRANSFER' : item.type}`
                    : `${item.readAt ? '' : '● '}${item.title}`}
                </Copy>
                <Copy muted>{activity ? item.nft.name : item.body}</Copy>
                <Copy muted>{new Date(item.createdAt).toLocaleString()}</Copy>
              </View>
            </Pressable>
          );
        }}
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
              title={notifications ? 'You’re all caught up' : 'The next chapter starts with you'}
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
