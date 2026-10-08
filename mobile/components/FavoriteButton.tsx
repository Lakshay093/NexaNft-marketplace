import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { NFT } from '@nexanft/contracts';
import { Button, Copy } from './ui';
import { useAuthStore } from '../store/auth';
import { request } from '../services/api';
import { errorMessage } from '../services/errors';
export function FavoriteButton({ nft }: { nft: NFT }) {
  const user = useAuthStore((s) => s.user),
    router = useRouter(),
    cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      request(`/nfts/${nft.id}/favorite`, { method: nft.isFavorited ? 'DELETE' : 'POST' }),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['nft', nft.id] }),
        cache.invalidateQueries({ queryKey: ['nfts'] }),
        cache.invalidateQueries({ queryKey: ['profile'] }),
      ]);
    },
  });
  return (
    <>
      <Button
        title={nft.isFavorited ? '♥ Saved to favorites' : '♡ Save to favorites'}
        variant="secondary"
        loading={mutation.isPending}
        onPress={() => {
          if (!user) router.push('/(auth)/login');
          else mutation.mutate();
        }}
      />
      {mutation.isError && <Copy>{errorMessage(mutation.error)}</Copy>}
    </>
  );
}
