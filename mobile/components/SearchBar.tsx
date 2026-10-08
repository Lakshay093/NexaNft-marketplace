import { View, Pressable, Text, TextInput } from 'react-native';
import { colors } from '../constants/theme';
import { styles } from './ui';
export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={[styles.input, { flexDirection: 'row', gap: 10, alignItems: 'center' }]}>
      <Text style={{ color: colors.muted, fontSize: 22 }}>⌕</Text>
      <TextInput
        accessibilityLabel="Search NFTs"
        placeholder="Art, creators, collections…"
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
        style={{ flex: 1, color: colors.text, fontSize: 15 }}
        autoCapitalize="none"
        returnKeyType="search"
        maxLength={100}
      />
      {value.length > 0 && (
        <Pressable accessibilityLabel="Clear search" onPress={() => onChange('')}>
          <Text style={{ color: colors.muted }}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}
