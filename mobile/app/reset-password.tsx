import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { passwordSchema } from '@nexanft/contracts';
import { ScreenContainer, Heading, Copy, Input, Button } from '../components/ui';
import { authClient } from '../services/auth';
import { errorMessage } from '../services/errors';
export default function Reset() {
  const { token } = useLocalSearchParams<{ token: string }>(),
    router = useRouter();
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <ScreenContainer scroll>
      <Heading>A fresh start.</Heading>
      <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry />
      <Input label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />
      <Button
        title="Reset password"
        loading={busy}
        onPress={() => {
          const parsed = passwordSchema.safeParse(password);
          if (!parsed.success) {
            setMessage(parsed.error.issues[0]?.message ?? 'Invalid password');
            return;
          }
          if (password !== confirm) {
            setMessage('Passwords must match');
            return;
          }
          setBusy(true);
          void authClient
            .post('/auth/reset-password', { token, password })
            .then(() => router.replace('/(auth)/login'))
            .catch((e) => setMessage(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      />
      {message && <Copy>{message}</Copy>}
    </ScreenContainer>
  );
}
