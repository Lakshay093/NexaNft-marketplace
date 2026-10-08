import type { Session, CurrentUser } from '@nexanft/contracts';
export interface TokenStorage {
  get: () => Promise<string | null>;
  set: (token: string) => Promise<void>;
  clear: () => Promise<void>;
}
interface Transport {
  refresh: (token: string) => Promise<Session>;
  logout: (token: string) => Promise<void>;
  isUnauthorized: (error: unknown) => boolean;
}
export class SessionManager {
  private current: Session | null = null;
  private pending: Promise<Session> | null = null;
  private generation = 0;
  private listeners = new Set<(session: Session | null) => void>();
  private storageQueue: Promise<void> = Promise.resolve();
  constructor(
    private storage: TokenStorage,
    private transport: Transport,
  ) {}
  get accessToken() {
    return this.current?.accessToken;
  }
  get session() {
    return this.current;
  }
  updateUser(user: CurrentUser) {
    if (this.current?.user.id === user.id) {
      this.current = { ...this.current, user };
      this.notify();
    }
  }
  subscribe(listener: (session: Session | null) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private notify() {
    this.listeners.forEach((fn) => fn(this.current));
  }
  private queue<T>(task: () => Promise<T>) {
    const result = this.storageQueue.then(task, task);
    this.storageQueue = result.then(
      () => {},
      () => {},
    );
    return result;
  }
  private async persist(session: Session, generation: number) {
    await this.queue(async () => {
      if (generation !== this.generation) throw new Error('Session changed');
      await this.storage.set(session.refreshToken);
    });
    if (generation !== this.generation) throw new Error('Session changed');
    this.current = session;
    this.notify();
  }
  async accept(session: Session) {
    await this.persist(session, ++this.generation);
  }
  async restore() {
    const token = await this.storage.get();
    if (token) await this.rotate(token);
  }
  async refresh() {
    const token = this.current?.refreshToken ?? (await this.storage.get());
    if (!token) throw new Error('Sign in to continue');
    return this.rotate(token);
  }
  private rotate(token: string) {
    if (this.pending) return this.pending;
    const generation = this.generation;
    this.pending = (async () => {
      try {
        const session = await this.transport.refresh(token);
        if (generation !== this.generation) throw new Error('Session changed');
        await this.persist(session, generation);
        return session;
      } catch (err) {
        if (this.transport.isUnauthorized(err) && generation === this.generation)
          await this.clear();
        throw err;
      } finally {
        this.pending = null;
      }
    })();
    return this.pending;
  }
  async clear() {
    this.generation++;
    this.current = null;
    this.notify();
    await this.queue(() => this.storage.clear());
  }
  async logout() {
    const token = this.current?.refreshToken ?? (await this.storage.get());
    await this.clear();
    if (token) await this.transport.logout(token);
  }
}
