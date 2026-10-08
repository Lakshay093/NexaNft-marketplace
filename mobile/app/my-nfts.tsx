import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AuthGate } from '../components/AuthGate';
import { ScreenContainer, Heading, Button, Copy } from '../components/ui';
import { NFTGrid } from '../features/marketplace/NFTGrid';
import { useAuthStore } from '../store/auth';
function MyWorks() {
  const user = useAuthStore((s) => s.user!),
    params = useLocalSearchParams<{ mode?: string }>(),
    [mode, setMode] = useState<'owned' | 'created'>(
      params.mode === 'created' ? 'created' : 'owned',
    );
  return (
    <ScreenContainer>
      <NFTGrid
        path={`/users/${user.id}/nfts`}
        filters={{ mode }}
        header={
          <View style={{ gap: 16, paddingBottom: 20 }}>
            <Heading>My works</Heading>
            <Copy muted>Ownership here is recorded by the platform.</Copy>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title="Owned"
                variant={mode === 'owned' ? 'primary' : 'secondary'}
                onPress={() => setMode('owned')}
              />
              <Button
                title="Created"
                variant={mode === 'created' ? 'primary' : 'secondary'}
                onPress={() => setMode('created')}
              />
            </View>
          </View>
        }
      />
    </ScreenContainer>
  );
}
export default function MyNFTs() {
  return (
    <AuthGate>
      <MyWorks />
    </AuthGate>
  );
}
