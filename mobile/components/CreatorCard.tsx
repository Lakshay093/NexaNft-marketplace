import { Pressable, Text } from 'react-native';
import type { User } from '@nexanft/contracts';
import { useRouter } from 'expo-router';
import { Avatar, styles } from './ui';
import { colors } from '../constants/theme';
export function CreatorCard({ creator }: { creator: User }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/creator/${creator.id}`)}
      style={[styles.card, { alignItems: 'center', width: 150, padding: 20 }]}
    >
      <Avatar uri={creator.avatarUrl} name={creator.fullName} size={64} />
      <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '800' }}>
        {creator.fullName}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11 }}>@{creator.username}</Text>
    </Pressable>
  );
}
