import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { querySchema } from '@nexanft/contracts';
import { ScreenContainer, Heading, Button, Copy } from '../../components/ui';
import { SearchBar } from '../../components/SearchBar';
import { FilterModal } from '../../components/FilterModal';
import { NFTGrid } from './NFTGrid';
import { useSearchStore } from '../../store/search';
import { useDebounce } from '../../hooks/useDebounce';
export function ExploreScreen({ title = 'Explore' }: { title?: string }) {
  const { category } = useLocalSearchParams<{ category?: string }>(),
    { q, filters, setQ, setFilters, reset } = useSearchStore(),
    [show, setShow] = useState(false);
  const debounced = useDebounce(q);
  useEffect(() => {
    if (category) {
      const valid = querySchema.safeParse({ category });
      if (valid.success)
        setFilters({ ...useSearchStore.getState().filters, category: valid.data.category });
    }
  }, [category, setFilters]);
  const header = (
    <View style={{ gap: 16, paddingBottom: 20 }}>
      <Heading>{title}</Heading>
      <Copy muted>Find something that feels like you.</Copy>
      <SearchBar value={q} onChange={setQ} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button title="Filters & sort" onPress={() => setShow(true)} variant="secondary" />
        <Button title="Clear" onPress={reset} variant="secondary" />
      </View>
      <Copy muted>
        {filters.category ?? 'All categories'} · {filters.status ?? 'All statuses'} · {filters.sort}
      </Copy>
    </View>
  );
  return (
    <ScreenContainer>
      <NFTGrid path="/search" filters={{ ...filters, q: debounced || undefined }} header={header} />
      <FilterModal
        visible={show}
        onClose={() => setShow(false)}
        filters={filters}
        onApply={setFilters}
      />
    </ScreenContainer>
  );
}
