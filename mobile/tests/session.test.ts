import { describe, it, expect, vi } from 'vitest';
import { SessionManager } from '../services/session';
import type { Session } from '@nexanft/contracts';
const fixture: Session = {
  accessToken: 'access',
  refreshToken: 'rotated',
  user: {
    id: 'test',
    email: 'test@example.test',
    fullName: 'Test',
    username: 'test',
    bio: '',
    avatarUrl: null,
    createdAt: '2026-01-01',
  },
};
function setup(refresh = vi.fn(async () => fixture)) {
  let token: string | null = 'saved';
  const storage = {
    get: async () => token,
    set: async (value: string) => {
      token = value;
    },
    clear: async () => {
      token = null;
    },
  };
  const transport = {
    refresh,
    logout: vi.fn(async () => {}),
    isUnauthorized: (e: unknown) => e === 'unauthorized',
  };
  return { manager: new SessionManager(storage, transport), storage, transport };
}
describe('session lifecycle', () => {
  it('restores from persisted refresh tokens and rotates storage', async () => {
    const { manager, storage } = setup();
    await manager.restore();
    expect(manager.accessToken).toBe('access');
    expect(await storage.get()).toBe('rotated');
  });
  it('uses one refresh for concurrent callers', async () => {
    const { manager, transport } = setup();
    await Promise.all([manager.refresh(), manager.refresh(), manager.refresh()]);
    expect(transport.refresh).toHaveBeenCalledTimes(1);
  });
  it('retains token after an offline restore for a later retry', async () => {
    const { manager, storage } = setup(
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    await expect(manager.restore()).rejects.toThrow('offline');
    expect(await storage.get()).toBe('saved');
  });
  it('clears an expired refresh token', async () => {
    const { manager, storage } = setup(
      vi.fn(async () => {
        throw 'unauthorized';
      }),
    );
    await expect(manager.restore()).rejects.toBe('unauthorized');
    expect(await storage.get()).toBeNull();
  });
  it('does not resurrect a session after sign out during refresh', async () => {
    let resolve!: (s: Session) => void;
    const { manager, storage } = setup(
      vi.fn(
        () =>
          new Promise<Session>((r) => {
            resolve = r;
          }),
      ),
    );
    const refreshing = manager.restore();
    await new Promise((r) => setTimeout(r, 0));
    await manager.clear();
    resolve(fixture);
    await expect(refreshing).rejects.toThrow('Session changed');
    expect(manager.session).toBeNull();
    expect(await storage.get()).toBeNull();
  });
  it('serializes token deletion after an in-flight storage write', async () => {
    let token: string | null = null;
    let finish!: () => void;
    const manager = new SessionManager(
      {
        get: async () => token,
        set: async (value) => {
          await new Promise<void>((r) => {
            finish = r;
          });
          token = value;
        },
        clear: async () => {
          token = null;
        },
      },
      { refresh: async () => fixture, logout: async () => {}, isUnauthorized: () => false },
    );
    const accepted = manager.accept(fixture);
    await new Promise((r) => setTimeout(r, 0));
    const rejected = expect(accepted).rejects.toThrow('Session changed');
    const cleared = manager.clear();
    finish();
    await Promise.all([rejected, cleared]);
    expect(manager.session).toBeNull();
    expect(token).toBeNull();
  });
});
