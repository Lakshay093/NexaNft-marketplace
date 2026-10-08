import { useEffect, useState } from 'react';
import { Modal, ScrollView, View, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categories, statuses, querySchema, type SearchFilters } from '@nexanft/contracts';
import { Button, Heading, Copy, Input, styles } from './ui';
import { colors } from '../constants/theme';
const sorts = [
  ['newest', 'Newest'],
  ['oldest', 'Oldest'],
  ['price_asc', 'Price ↑'],
  ['price_desc', 'Price ↓'],
  ['popular', 'Most popular'],
] as const;
function Chip({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        borderRadius: 22,
        padding: 12,
        backgroundColor: active ? colors.accent : colors.raised,
      }}
    >
      <Text style={{ color: active ? colors.bg : colors.text }}>{title}</Text>
    </Pressable>
  );
}
export function FilterModal({
  visible,
  onClose,
  filters,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}) {
  const [draft, setDraft] = useState(filters),
    [error, setError] = useState('');
  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setError('');
    }
  }, [visible, filters]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
          <Heading>Make it your own.</Heading>
          <Copy muted>Category</Copy>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Chip
              title="All"
              active={!draft.category}
              onPress={() => setDraft({ ...draft, category: undefined })}
            />
            {categories.map((c) => (
              <Chip
                key={c}
                title={c}
                active={draft.category === c}
                onPress={() => setDraft({ ...draft, category: c })}
              />
            ))}
          </View>
          <Copy muted>Listing status</Copy>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Chip
              title="All"
              active={!draft.status}
              onPress={() => setDraft({ ...draft, status: undefined })}
            />
            {statuses.map((s) => (
              <Chip
                key={s}
                title={s}
                active={draft.status === s}
                onPress={() => setDraft({ ...draft, status: s })}
              />
            ))}
          </View>
          <Input
            label="Minimum price (ETH)"
            keyboardType="decimal-pad"
            value={draft.minPrice ?? ''}
            onChangeText={(v) => setDraft({ ...draft, minPrice: v || undefined })}
          />
          <Input
            label="Maximum price (ETH)"
            keyboardType="decimal-pad"
            value={draft.maxPrice ?? ''}
            onChangeText={(v) => setDraft({ ...draft, maxPrice: v || undefined })}
          />
          <Copy muted>Sort by</Copy>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {sorts.map(([sort, title]) => (
              <Chip
                key={sort}
                title={title}
                active={draft.sort === sort}
                onPress={() => setDraft({ ...draft, sort })}
              />
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            title="Show results"
            onPress={() => {
              const parsed = querySchema.safeParse(draft);
              if (!parsed.success) {
                setError(parsed.error.issues[0]?.message ?? 'Check your filters');
                return;
              }
              onApply(draft);
              onClose();
            }}
          />
          <Button
            title="Reset filters"
            variant="secondary"
            onPress={() => setDraft({ sort: 'newest' })}
          />
          <Button title="Close" variant="secondary" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
