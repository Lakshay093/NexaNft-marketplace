import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { NFT, Collection, User, SearchFilters } from '@nexanft/contracts';
import { request } from '../services/api';
import { useAuthStore } from '../store/auth';
export function useNFTFeed(filters: SearchFilters = {}, path = '/nfts') {
  const userId = useAuthStore((s) => s.user?.id);
  return useInfiniteQuery({
    queryKey: ['nfts', userId, path, filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<NFT[]>(path, { params: { ...filters, page: pageParam, limit: 20 }, signal }),
    getNextPageParam: (last) =>
      last.pagination && last.pagination.page < last.pagination.pages
        ? last.pagination.page + 1
        : undefined,
  });
}
export function useNFTs(filters: SearchFilters = {}) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['nfts', userId, filters],
    queryFn: ({ signal }) => request<NFT[]>('/nfts', { params: { ...filters, limit: 8 }, signal }),
  });
}
export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: ({ signal }) => request<Collection[]>('/collections', { signal }),
  });
}
export function useOwnedCollections(creatorId: string) {
  return useInfiniteQuery({
    queryKey: ['collections', creatorId],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<Collection[]>('/collections', {
        params: { creatorId, page: pageParam, limit: 20 },
        signal,
      }),
    getNextPageParam: (last) =>
      last.pagination && last.pagination.page < last.pagination.pages
        ? last.pagination.page + 1
        : undefined,
  });
}
export function useCreators() {
  return useQuery({
    queryKey: ['creators'],
    queryFn: ({ signal }) => request<User[]>('/creators', { params: { limit: 8 }, signal }),
  });
}
