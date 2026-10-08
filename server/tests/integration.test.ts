import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/models/db';
import type { Session } from '@nexanft/contracts';
import sharp from 'sharp';
import { readdir, readFile, unlink, mkdir } from 'node:fs/promises';
const app = createApp();
const password = 'Test-only-Strong1!';
const registration = {
  fullName: 'Test Artist',
  username: 'test_artist',
  email: 'artist@example.test',
  password,
  confirmPassword: password,
};
let artist: Session;
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
    throw new Error('Unsafe test database');
  execFileSync(
    process.execPath,
    [
      join(
        dirname(createRequire(process.cwd() + '/package.json').resolve('prisma/package.json')),
        'build/index.js',
      ),
      'migrate',
      'deploy',
    ],
    { stdio: 'pipe' },
  );
  await db.notification.deleteMany();
  await db.activity.deleteMany();
  await db.favorite.deleteMany();
  await db.nFT.deleteMany();
  await db.collection.deleteMany();
  await db.asset.deleteMany();
  await db.passwordReset.deleteMany();
  await db.refreshToken.deleteMany();
  await db.user.deleteMany();
});
afterAll(() => db.$disconnect());
describe('authentication against PostgreSQL', () => {
  it('rejects invalid registration and exposes field errors', async () => {
    const r = await request(app)
      .post('/api/auth/register')
      .send({ ...registration, password: 'weak' });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('VALIDATION_ERROR');
  });
  it('registers with a hash and returns safe user fields', async () => {
    const r = await request(app).post('/api/auth/register').send(registration);
    expect(r.status).toBe(201);
    artist = r.body.data;
    expect(artist.user).not.toHaveProperty('passwordHash');
    const stored = await db.user.findUniqueOrThrow({ where: { id: artist.user.id } });
    expect(stored.passwordHash).not.toBe(password);
  });
  it('enforces uniqueness', async () => {
    const r = await request(app).post('/api/auth/register').send(registration);
    expect(r.status).toBe(409);
  });
  it('rejects wrong passwords and protects session routes', async () => {
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: registration.email, password: 'wrong' })
      ).status,
    ).toBe(401);
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect(
      (await request(app).get('/api/auth/me').auth(artist.accessToken, { type: 'bearer' })).status,
    ).toBe(200);
  });
  it('rotates refresh tokens and revokes a replayed family', async () => {
    const r = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: artist.refreshToken });
    expect(r.status).toBe(200);
    expect(r.body.data.refreshToken).not.toBe(artist.refreshToken);
    const replay = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: artist.refreshToken });
    expect(replay.status).toBe(401);
    expect(
      (await request(app).get('/api/auth/me').auth(r.body.data.accessToken, { type: 'bearer' }))
        .status,
    ).toBe(401);
  });
  it('revokes access on logout', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: registration.email, password });
    artist = login.body.data;
    expect(
      (await request(app).post('/api/auth/logout').send({ refreshToken: artist.refreshToken }))
        .status,
    ).toBe(200);
    expect(
      (await request(app).get('/api/auth/me').auth(artist.accessToken, { type: 'bearer' })).status,
    ).toBe(401);
  });
  it('rejects disallowed origins without exposing internals', async () => {
    const r = await request(app).get('/api/auth/me').set('Origin', 'https://untrusted.example');
    expect(r.status).toBe(403);
    expect(r.body).not.toHaveProperty('stack');
  });
});
describe('marketplace reads', () => {
  it('returns paginated database data and validates filters', async () => {
    const r = await request(app).get('/api/nfts?limit=10');
    expect(r.status).toBe(200);
    expect(r.body.pagination).toMatchObject({ page: 1, limit: 10, total: 0 });
    expect((await request(app).get('/api/nfts?limit=999')).status).toBe(400);
  });
  it('keeps email and hashes out of public profiles', async () => {
    const r = await request(app).get(`/api/users/${artist.user.id}`);
    expect(r.status).toBe(200);
    expect(r.body.data).not.toHaveProperty('email');
    expect(r.body.data).not.toHaveProperty('passwordHash');
  });
});
describe('server-backed search', () => {
  it('filters by creator, collection, category and price, and sorts numerically', async () => {
    const collection = await db.collection.create({
      data: {
        name: 'Test Collection',
        description: 'Searchable collection',
        imageUrl: 'https://example.test/image.png',
        creatorId: artist.user.id,
      },
    });
    for (const [name, price, category] of [
      ['Searchable Orbit', '2', 'Art'],
      ['Searchable Echo', '10', 'Gaming'],
      ['Searchable Moon', '1', 'Art'],
    ] as const)
      await db.nFT.create({
        data: {
          name,
          description: 'A test artwork',
          price,
          category,
          creatorId: artist.user.id,
          ownerId: artist.user.id,
          collectionId: collection.id,
          imageUrl: 'https://example.test/image.png',
        },
      });
    const sorted = await request(app).get('/api/search?q=Searchable&sort=price_asc&limit=2');
    expect(sorted.status).toBe(200);
    expect(sorted.body.data.map((n: { price: string }) => n.price)).toEqual(['1', '2']);
    expect(sorted.body.pagination.total).toBe(3);
    const filtered = await request(app).get(
      '/api/search?q=Test%20Collection&category=Art&minPrice=1.5&maxPrice=5',
    );
    expect(filtered.body.data.map((n: { name: string }) => n.name)).toEqual(['Searchable Orbit']);
    expect((await request(app).get('/api/search?q=test_artist')).body.pagination.total).toBe(3);
    expect((await request(app).get('/api/search?minPrice=5&maxPrice=1')).status).toBe(400);
  });
});
describe('persisted favorites', () => {
  it('requires authentication, prevents duplicates, persists saves and removes them', async () => {
    artist = (
      await request(app).post('/api/auth/login').send({ email: registration.email, password })
    ).body.data;
    const nft = await db.nFT.findFirstOrThrow();
    expect((await request(app).post(`/api/nfts/${nft.id}/favorite`)).status).toBe(401);
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request(app)
            .post(`/api/nfts/${nft.id}/favorite`)
            .auth(artist.accessToken, { type: 'bearer' })
        ).status,
      ).toBe(200);
    expect(await db.favorite.count({ where: { userId: artist.user.id, nftId: nft.id } })).toBe(1);
    const list = await request(app)
      .get(`/api/users/${artist.user.id}/favorites`)
      .auth(artist.accessToken, { type: 'bearer' });
    expect(list.body.data[0].isFavorited).toBe(true);
    expect(
      (
        await request(app)
          .get('/api/users/00000000-0000-4000-a000-000000000000/favorites')
          .auth(artist.accessToken, { type: 'bearer' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .delete(`/api/nfts/${nft.id}/favorite`)
          .auth(artist.accessToken, { type: 'bearer' })
      ).status,
    ).toBe(200);
    expect(await db.favorite.count()).toBe(0);
  });
});
describe('image upload, listing authorization and transfers', () => {
  let assetId: string;
  let listingId: string;
  let buyer: Session;
  let other: Session;
  it('validates image bytes, persists a decoded image and requires authentication', async () => {
    const image = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#D9FA65' },
    })
      .png()
      .toBuffer();
    expect(
      (
        await request(app)
          .post('/api/uploads')
          .field('purpose', 'nft')
          .attach('image', image, { filename: 'test.png', contentType: 'image/png' })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/uploads')
          .auth(artist.accessToken, { type: 'bearer' })
          .field('purpose', 'nft')
          .attach('image', Buffer.from('<script>bad</script>'), {
            filename: 'fake.png',
            contentType: 'image/png',
          })
      ).status,
    ).toBe(400);
    const r = await request(app)
      .post('/api/uploads')
      .auth(artist.accessToken, { type: 'bearer' })
      .field('purpose', 'nft')
      .attach('image', image, { filename: 'test.png', contentType: 'image/png' });
    expect(r.status).toBe(201);
    assetId = r.body.data.id;
    const stored = await request(app).get(new URL(r.body.data.url).pathname);
    expect(stored.status).toBe(200);
    expect(stored.headers['content-type']).toContain('image/webp');
  });
  it('creates real listings, validates metadata and rejects client-controlled ownership', async () => {
    const input = {
      name: 'Created through API',
      description: 'Real image, real database listing.',
      price: '1.25',
      category: 'Art',
      assetId,
      collectionId: (await db.collection.findFirstOrThrow({ where: { creatorId: artist.user.id } }))
        .id,
    };
    expect(
      (
        await request(app)
          .post('/api/nfts')
          .auth(artist.accessToken, { type: 'bearer' })
          .send({ ...input, ownerId: 'fake' })
      ).status,
    ).toBe(400);
    const r = await request(app)
      .post('/api/nfts')
      .auth(artist.accessToken, { type: 'bearer' })
      .send(input);
    expect(r.status).toBe(201);
    listingId = r.body.data.id;
    expect(r.body.data.ownerId).toBe(artist.user.id);
    expect(r.body.data.creator).not.toHaveProperty('passwordHash');
    const get = await request(app).get(`/api/nfts/${listingId}`);
    expect(get.status).toBe(200);
    expect(get.body.data.viewsCount).toBe(1);
  });
  it('rejects non-owner edits, deletes and foreign uploads', async () => {
    buyer = (
      await request(app)
        .post('/api/auth/register')
        .send({ ...registration, username: 'buyer', email: 'buyer@example.test' })
    ).body.data;
    other = (
      await request(app)
        .post('/api/auth/register')
        .send({ ...registration, username: 'other', email: 'other@example.test' })
    ).body.data;
    expect(
      (
        await request(app)
          .patch(`/api/nfts/${listingId}`)
          .auth(buyer.accessToken, { type: 'bearer' })
          .send({ price: '3' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .delete(`/api/nfts/${listingId}`)
          .auth(buyer.accessToken, { type: 'bearer' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app).post('/api/nfts').auth(buyer.accessToken, { type: 'bearer' }).send({
          name: 'Foreign asset',
          description: 'Should not allow this upload',
          price: '1',
          category: 'Art',
          assetId,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/api/nfts/${listingId}`)
          .auth(artist.accessToken, { type: 'bearer' })
          .send({ price: '2.5' })
      ).status,
    ).toBe(200);
  });
  it('permits only one concurrent acquisition and atomically writes activity and notifications', async () => {
    const results = await Promise.all(
      [buyer, other].map((session) =>
        request(app)
          .post(`/api/nfts/${listingId}/demo-transfer`)
          .auth(session.accessToken, { type: 'bearer' })
          .send({ acknowledgeDemo: true }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const stored = await db.nFT.findUniqueOrThrow({ where: { id: listingId } });
    expect(stored.status).toBe('SOLD');
    expect(stored.creatorId).toBe(artist.user.id);
    expect([buyer.user.id, other.user.id]).toContain(stored.ownerId);
    expect(await db.activity.count({ where: { nftId: listingId, type: 'TRANSFERRED' } })).toBe(1);
    expect(await db.notification.count({ where: { nftId: listingId } })).toBe(2);
    const owner = stored.ownerId === buyer.user.id ? buyer : other;
    expect(
      (
        await request(app)
          .patch(`/api/nfts/${listingId}`)
          .auth(owner.accessToken, { type: 'bearer' })
          .send({ price: '2', collectionId: stored.collectionId })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .delete(`/api/nfts/${listingId}`)
          .auth(owner.accessToken, { type: 'bearer' })
      ).status,
    ).toBe(200);
    expect((await request(app).get(`/api/nfts/${listingId}`)).status).toBe(404);
  });
});
describe('profiles, collections, activity and private notifications', () => {
  it('updates only the caller profile and maintains public-field boundaries', async () => {
    const r = await request(app)
      .patch(`/api/users/${artist.user.id}`)
      .auth(artist.accessToken, { type: 'bearer' })
      .send({ bio: 'A changed artist biography.' });
    expect(r.status).toBe(200);
    expect(r.body.data.bio).toBe('A changed artist biography.');
    expect(r.body.data).not.toHaveProperty('passwordHash');
    expect(
      (
        await request(app)
          .patch('/api/users/00000000-0000-4000-a000-000000000000')
          .auth(artist.accessToken, { type: 'bearer' })
          .send({ fullName: 'Intruder' })
      ).status,
    ).toBe(403);
  });
  it('creates collections with purpose-scoped uploads', async () => {
    const image = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#AA99EE' },
    })
      .png()
      .toBuffer();
    const upload = await request(app)
      .post('/api/uploads')
      .auth(artist.accessToken, { type: 'bearer' })
      .field('purpose', 'collection')
      .attach('image', image, { filename: 'cover.png', contentType: 'image/png' });
    const r = await request(app)
      .post('/api/collections')
      .auth(artist.accessToken, { type: 'bearer' })
      .send({
        name: 'Created Collection',
        description: 'A real collection from the API',
        assetId: upload.body.data.id,
      });
    expect(r.status).toBe(201);
    expect(r.body.data.creator.id).toBe(artist.user.id);
    expect((await request(app).get(`/api/collections/${r.body.data.id}`)).status).toBe(200);
  });
  it('returns safe activity records and protects notification read ownership', async () => {
    const activity = await request(app).get('/api/activity');
    expect(activity.status).toBe(200);
    for (const a of activity.body.data) expect(a.actor).not.toHaveProperty('email');
    expect((await request(app).get('/api/notifications')).status).toBe(401);
    const notes = await request(app)
      .get('/api/notifications')
      .auth(artist.accessToken, { type: 'bearer' });
    expect(notes.status).toBe(200);
    expect(notes.body.data.length).toBeGreaterThan(0);
    expect(
      (
        await request(app)
          .patch('/api/notifications/read-all')
          .auth(artist.accessToken, { type: 'bearer' })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app).get('/api/notifications').auth(artist.accessToken, { type: 'bearer' })
      ).body.data.every((n: { readAt: string }) => Boolean(n.readAt)),
    ).toBe(true);
  });
});
describe('single-use password recovery', () => {
  it('uses a generic response and revokes every session on recovery', async () => {
    await mkdir('.data/outbox', { recursive: true });
    const before = new Set(await readdir('.data/outbox'));
    const known = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: registration.email });
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'absent@example.test' });
    expect(known.body.message).toBe(unknown.body.message);
    const filename = (await readdir('.data/outbox')).find((file) => !before.has(file))!;
    const text = await readFile(`.data/outbox/${filename}`, 'utf8');
    const token = text.match(/token=([a-f0-9]{64})/)?.[1];
    expect(token).toBeDefined();
    const r = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'Changed-test-Strong2!' });
    expect(r.status).toBe(200);
    expect(
      (await request(app).get('/api/auth/me').auth(artist.accessToken, { type: 'bearer' })).status,
    ).toBe(401);
    expect(
      (await request(app).post('/api/auth/reset-password').send({ token, password })).status,
    ).toBe(400);
    await unlink(`.data/outbox/${filename}`);
  });
});
describe('authentication rate-limit boundaries', () => {
  it('restores sessions repeatedly without consuming sign-in attempts', async () => {
    const limitedApp = createApp();
    const credentials = { email: registration.email, password: 'Changed-test-Strong2!' };
    const login = await request(limitedApp).post('/api/auth/login').send(credentials);
    expect(login.status).toBe(200);
    let session: Session = login.body.data;
    for (let i = 0; i < 31; i++) {
      const refresh = await request(limitedApp)
        .post('/api/auth/refresh')
        .send({ refreshToken: session.refreshToken });
      expect(refresh.status).toBe(200);
      session = refresh.body.data;
    }
    expect(
      (await request(limitedApp).get('/api/auth/me').auth(session.accessToken, { type: 'bearer' }))
        .status,
    ).toBe(200);
    expect((await request(limitedApp).post('/api/auth/login').send(credentials)).status).toBe(200);
    expect(
      (
        await request(limitedApp)
          .post('/api/auth/logout')
          .send({ refreshToken: session.refreshToken })
      ).status,
    ).toBe(200);
  });
  it('still limits credential attempts without blocking session routes', async () => {
    const limitedApp = createApp();
    for (let i = 0; i < 30; i++)
      expect((await request(limitedApp).post('/api/auth/login').send({})).status).toBe(400);
    const blocked = await request(limitedApp).post('/api/auth/login').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
    expect(blocked.headers['retry-after']).toBeDefined();
    expect((await request(limitedApp).get('/api/auth/me')).status).toBe(401);
    expect((await request(limitedApp).post('/api/auth/logout').send({})).status).toBe(400);
  });
});
