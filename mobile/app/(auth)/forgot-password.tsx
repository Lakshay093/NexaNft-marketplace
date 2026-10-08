import { useState } from 'react';
import { ScreenContainer, Heading, Copy, Input, Button } from '../../components/ui';
import { authClient } from '../../services/auth';
import { errorMessage } from '../../services/errors';
export default function Forgot() {
  const [email, setEmail] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <ScreenContainer scroll>
      <Heading>Find your way back.</Heading>
      <Copy muted>We’ll send a recovery link to your registered email.</Copy>
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button
        title="Send recovery link"
        loading={busy}
        onPress={() => {
          setBusy(true);
          void authClient
            .post('/auth/forgot-password', { email })
            .then(() => setMessage('If that email is registered, a recovery link has been sent.'))
            .catch((e) => setMessage(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      />
      {message && <Copy>{message}</Copy>}
    </ScreenContainer>
  );
}
