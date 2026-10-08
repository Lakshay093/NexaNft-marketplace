import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { NFT } from '@nexanft/contracts';
import { request } from '../../services/api';
import { AuthGate } from '../../components/AuthGate';
import { ListingForm } from '../../features/listings/ListingForm';
import { useAuthStore } from '../../store/auth';
import { ScreenContainer, EmptyState, LoadingIndicator, ErrorState } from '../../components/ui';
import { errorMessage } from '../../services/errors';
function Edit() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    user = useAuthStore((s) => s.user!);
  const q = useQuery({
    queryKey: ['nft', id, user.id],
    queryFn: () => request<NFT>(`/nfts/${id}`),
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
  return q.data.data.ownerId === user.id ? (
    <ListingForm nft={q.data.data} />
  ) : (
    <ScreenContainer>
      <EmptyState title="Only the owner can edit this listing" />
    </ScreenContainer>
  );
}
export default function EditNFT() {
  return (
    <AuthGate>
      <Edit />
    </AuthGate>
  );
}
