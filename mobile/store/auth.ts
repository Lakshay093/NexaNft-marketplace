import { create } from 'zustand';
import type { CurrentUser } from '@nexanft/contracts';
import { sessions } from '../services/auth';
import { errorMessage } from '../services/errors';
interface AuthState {
  user: CurrentUser | null;
  hydrated: boolean;
  restoreError: string | null;
  restore: () => Promise<void>;
}
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  restoreError: null,
  restore: async () => {
    set({ restoreError: null });
    try {
      await sessions.restore();
    } catch (error) {
      set({ restoreError: errorMessage(error) });
    } finally {
      set({ hydrated: true });
    }
  },
}));
sessions.subscribe((session) =>
  useAuthStore.setState({ user: session?.user ?? null, restoreError: null }),
);
