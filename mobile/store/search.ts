import { create } from 'zustand';
import type { SearchFilters } from '@nexanft/contracts';
interface SearchState {
  q: string;
  filters: SearchFilters;
  setQ: (q: string) => void;
  setFilters: (filters: SearchFilters) => void;
  reset: () => void;
}
export const useSearchStore = create<SearchState>((set) => ({
  q: '',
  filters: { status: 'LISTED', sort: 'newest' },
  setQ: (q) => set({ q }),
  setFilters: (filters) => set({ filters }),
  reset: () => set({ q: '', filters: { sort: 'newest', status: 'LISTED' } }),
}));
