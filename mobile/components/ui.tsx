import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
  type ViewStyle,
  type ImageStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/theme';
import { resolveMediaUrl } from '../constants/config';
export function ScreenContainer({
  children,
  scroll = false,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.content, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Heading({
  children,
  small = false,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  return <Text style={[styles.heading, small && { fontSize: 22 }]}>{children}</Text>;
}
export function Copy({
  children,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: TextStyle;
}) {
  return <Text style={[styles.copy, muted && { color: colors.muted }, style]}>{children}</Text>;
}
export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  testID,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && { backgroundColor: colors.raised },
        variant === 'danger' && { backgroundColor: '#44272C' },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.bg} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant !== 'primary' && { color: variant === 'danger' ? colors.danger : colors.text },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Input({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          props.multiline && { minHeight: 110, textAlignVertical: 'top' },
          error && { borderColor: colors.danger },
        ]}
        {...props}
      />
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function Artwork({ uri, style }: { uri: string | null | undefined; style?: ImageStyle }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return failed || !uri ? (
    <View style={[styles.placeholder, style]}>
      <Ionicons name="image-outline" size={28} color={colors.muted} />
      <Text style={styles.label}>Image unavailable</Text>
    </View>
  ) : (
    <Image
      source={{ uri: resolveMediaUrl(uri) }}
      style={style}
      contentFit="cover"
      transition={200}
      onError={() => setFailed(true)}
      cachePolicy="memory-disk"
    />
  );
}
export function Avatar({
  uri,
  name,
  size = 42,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) {
  return uri ? (
    <Artwork uri={uri} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.bg, fontWeight: '800', fontSize: size / 3 }}>
        {name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}
export function LoadingIndicator() {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.accent} />
      <Copy muted>Loading your next discovery…</Copy>
    </View>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.state}>
      <Ionicons name="sparkles-outline" color={colors.accent} size={30} />
      <Heading small>{title}</Heading>
      {description && <Copy muted>{description}</Copy>}
      {action && <Button title={action.label} onPress={action.onPress} />}
    </View>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.state}>
      <Text accessibilityRole="alert" style={styles.error}>
        {message}
      </Text>
      <Button title="Try again" onPress={onRetry} variant="secondary" />
    </View>
  );
}
export function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Heading small>{title}</Heading>
      {right}
    </View>
  );
}
export function PriceDisplay({ price }: { price: string }) {
  return (
    <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>
      ◇ {Number(price).toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
      <Text style={{ fontSize: 12, color: colors.muted }}>ETH</Text>
    </Text>
  );
}
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 20 },
  heading: { fontSize: 34, fontWeight: '800', letterSpacing: -1, color: colors.text },
  copy: { fontSize: 15, lineHeight: 23, color: colors.text },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonText: { fontWeight: '800', fontSize: 15, color: colors.bg },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    color: colors.text,
  },
  label: { fontSize: 13, color: colors.muted },
  error: { fontSize: 14, lineHeight: 21, color: colors.danger },
  state: { padding: 24, alignItems: 'center', gap: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
  placeholder: {
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
