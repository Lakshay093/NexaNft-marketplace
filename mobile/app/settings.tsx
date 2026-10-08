import { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenContainer, Heading, Copy, Button } from '../components/ui';
import { enableNotifications } from '../services/notifications';
import { errorMessage } from '../services/errors';
export default function Settings() {
  const router = useRouter(),
    [message, setMessage] = useState('');
  return (
    <ScreenContainer scroll>
      <Heading>Your space, your way.</Heading>
      <Copy muted>NexaNFT · Version 1.0.0</Copy>
      <Copy muted>Made by Lakshay Dhiman</Copy>
      <Heading small>Notifications</Heading>
      <Copy>
        Enable local collection confirmations on this device. Marketplace notifications are also
        available in your inbox.
      </Copy>
      <Button
        title="Enable device notifications"
        variant="secondary"
        onPress={() =>
          void enableNotifications()
            .then(setMessage)
            .catch((e) => setMessage(errorMessage(e)))
        }
      />
      <Button
        title="Disable device notifications"
        variant="secondary"
        onPress={() => {
          void AsyncStorage.setItem('nexanft.localNotifications', 'false').then(() =>
            setMessage('Device confirmations disabled.'),
          );
        }}
      />
      {message && <Copy>{message}</Copy>}
      <Heading small>About this marketplace</Heading>
      <Copy>
        Artwork listings and ownership are maintained by NexaNFT. ETH is used as a display
        denomination. Demo transfers do not charge money or interact with a blockchain.
      </Copy>
      <Button
        title="View marketplace activity"
        variant="secondary"
        onPress={() => router.push('/activity')}
      />
      <Button
        title="Replay introduction"
        variant="secondary"
        onPress={() => {
          void AsyncStorage.removeItem('nexanft.onboarding').then(() => router.replace('/'));
        }}
      />
    </ScreenContainer>
  );
}
