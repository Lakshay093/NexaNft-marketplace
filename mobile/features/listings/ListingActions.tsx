import { useState } from 'react';
import { View, Modal, Text } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { NFT } from '@nexanft/contracts';
import { Button, Copy, Heading, styles } from '../../components/ui';
import { colors } from '../../constants/theme';
import { request } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { errorMessage } from '../../services/errors';
import { notifyCollection } from '../../services/notifications';
export function ListingActions({ nft }: { nft: NFT }) {
  const user = useAuthStore((s) => s.user),
    router = useRouter(),
    cache = useQueryClient(),
    [confirm, setConfirm] = useState<'transfer' | 'remove' | null>(null);
  const mutation = useMutation({
    mutationFn: (action: 'transfer' | 'remove' | 'unlist' | 'relist') =>
      request<NFT>(`/nfts/${nft.id}${action === 'transfer' ? '/demo-transfer' : ''}`, {
        method: action === 'transfer' ? 'POST' : action === 'remove' ? 'DELETE' : 'PATCH',
        data:
          action === 'transfer'
            ? { acknowledgeDemo: true }
            : action === 'remove'
              ? undefined
              : { status: action === 'unlist' ? 'UNLISTED' : 'LISTED' },
      }),
    onSuccess: async (_data, action) => {
      setConfirm(null);
      if (action === 'transfer') void notifyCollection(nft.name).catch(() => {});
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['nfts'] }),
        cache.invalidateQueries({ queryKey: ['nft', nft.id] }),
        cache.invalidateQueries({ queryKey: ['activity'] }),
        cache.invalidateQueries({ queryKey: ['notifications'] }),
        cache.invalidateQueries({ queryKey: ['profile'] }),
        cache.invalidateQueries({ queryKey: ['collections'] }),
        cache.invalidateQueries({ queryKey: ['creators'] }),
      ]);
      if (action === 'remove') router.replace('/(tabs)/explore');
    },
  });
  const owner = user?.id === nft.ownerId;
  return (
    <View style={{ gap: 12 }}>
      {owner ? (
        <>
          <Button
            title="Edit listing"
            variant="secondary"
            onPress={() => router.push(`/edit-nft/${nft.id}`)}
          />
          <Button
            title={nft.status === 'LISTED' ? 'Unlist artwork' : 'Relist artwork'}
            loading={mutation.isPending}
            variant="secondary"
            onPress={() => mutation.mutate(nft.status === 'LISTED' ? 'unlist' : 'relist')}
          />
          <Button title="Remove listing" variant="danger" onPress={() => setConfirm('remove')} />
        </>
      ) : nft.status === 'LISTED' && process.env.EXPO_PUBLIC_ENABLE_DEMO_TRANSFERS === 'true' ? (
        <Button
          title="Collect · demo transfer"
          onPress={() => {
            if (!user) router.push('/(auth)/login');
            else setConfirm('transfer');
          }}
        />
      ) : (
        <Copy muted>
          {nft.status === 'LISTED'
            ? 'Transfers are disabled. Save this artwork to your favorites.'
            : 'This artwork is currently unavailable.'}
        </Copy>
      )}
      {mutation.isError && <Text style={styles.error}>{errorMessage(mutation.error)}</Text>}
      <Modal
        visible={confirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#000B',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View style={[styles.card, { width: '100%', maxWidth: 480, padding: 24, gap: 20 }]}>
            <Heading small>
              {confirm === 'remove'
                ? 'Remove this listing?'
                : 'A demo, with real platform records.'}
            </Heading>
            <Copy>
              {confirm === 'remove'
                ? 'The listing will be hidden from the marketplace. Its activity history is retained.'
                : 'This action assigns the platform ownership record to your account. It does not charge ETH, process payment, mint a token, or transfer blockchain ownership.'}
            </Copy>
            {mutation.isError && (
              <Text style={{ color: colors.danger }}>{errorMessage(mutation.error)}</Text>
            )}
            <Button
              title={confirm === 'remove' ? 'Remove listing' : 'Confirm demo transfer'}
              loading={mutation.isPending}
              onPress={() => {
                if (confirm) mutation.mutate(confirm);
              }}
            />
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setConfirm(null)}
              disabled={mutation.isPending}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
