import { useEffect, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ScreenContainer,
  Heading,
  Copy,
  Button,
  LoadingIndicator,
  ErrorState,
} from '../components/ui';
import { View, Text } from 'react-native';
import { colors } from '../constants/theme';
import { useAuthStore } from '../store/auth';
export default function Entry() {
  const { hydrated, user, restoreError, restore } = useAuthStore(),
    router = useRouter();
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem('nexanft.onboarding')
      .then((value) => setSeen(value === 'done'))
      .catch(() => setSeen(false));
  }, []);
  if (!hydrated || seen === null)
    return (
      <ScreenContainer>
        <LoadingIndicator />
      </ScreenContainer>
    );
  if (restoreError)
    return (
      <ScreenContainer>
        <ErrorState message={restoreError} onRetry={() => void restore()} />
        <Button
          title="Browse while signed out"
          onPress={() => router.replace('/(tabs)')}
          variant="secondary"
        />
      </ScreenContainer>
    );
  if (seen || user) return <Redirect href="/(tabs)" />;
  return (
    <ScreenContainer scroll>
      <Copy muted>NEXANFT / DIGITAL CULTURE</Copy>
      <View
        style={{
          height: 230,
          borderRadius: 28,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '-3deg' }],
        }}
      >
        <Text style={{ fontSize: 140, fontWeight: '900', color: colors.bg }}>N↗</Text>
      </View>
      <Heading>Own a little extraordinary.</Heading>
      <Copy muted>
        Discover independent artists. Save what moves you. Give your imagination a home.
      </Copy>
      <Copy muted>
        Listings and ownership are platform records. ETH is a display denomination; no blockchain or
        payment processing is connected.
      </Copy>
      <Button
        title="Start exploring"
        onPress={() => {
          void AsyncStorage.setItem('nexanft.onboarding', 'done');
          router.replace('/(tabs)');
        }}
      />
      <Button
        title="Join the community"
        variant="secondary"
        onPress={() => router.push('/(auth)/register')}
      />
      <Copy muted style={{ textAlign: 'center' }}>
        Made by Lakshay Dhiman
      </Copy>
    </ScreenContainer>
  );
}
