import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
const mocks = vi.hoisted(() => ({ send: vi.fn(), findUnique: vi.fn() }));
vi.mock('../src/config/env', () => ({
  env: {
    STORAGE_DRIVER: 's3',
    STORAGE_REGION: 'auto',
    STORAGE_BUCKET: 'test-bucket',
    STORAGE_ACCESS_KEY: 'test-key',
    STORAGE_SECRET_KEY: 'test-secret',
    STORAGE_DELIVERY: 'proxy',
    CORS_ORIGINS: 'https://client.example.test',
    TRUST_PROXY: 0,
    NODE_ENV: 'test',
  },
}));
vi.mock('../src/models/db', () => ({ db: { asset: { findUnique: mocks.findUnique } } }));
vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();
  return {
    ...actual,
    S3Client: class {
      send = mocks.send;
    },
  };
});
import { readCloudMedia } from '../src/services/storage.service';
import { createApp } from '../src/app';
const key = '00000000-0000-4000-8000-000000000001/nft/00000000-0000-4000-8000-000000000002.webp';
const asset = { id: 'asset-id', size: 3, mimeType: 'image/webp' };
afterEach(() => vi.resetAllMocks());
describe('private bucket media reads', () => {
  it.each(['../secret', 'arbitrary/key.webp', key.replace('/nft/', '/private/')])(
    'rejects invalid object keys before storage access: %s',
    async (invalidKey) => {
      await expect(readCloudMedia(invalidKey)).rejects.toMatchObject({ status: 404 });
      expect(mocks.findUnique).not.toHaveBeenCalled();
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );
  it('only serves images registered by the application', async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(readCloudMedia(key)).rejects.toMatchObject({ status: 404 });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('returns the image stream and trusted media metadata', async () => {
    const stream = Readable.from([Buffer.from('img')]);
    mocks.findUnique.mockResolvedValue(asset);
    mocks.send.mockResolvedValue({ Body: stream });
    expect(await readCloudMedia(key)).toEqual({
      stream,
      size: 3,
      mimeType: 'image/webp',
      etag: '"asset-id"',
    });
    expect(mocks.send.mock.calls[0][0].input).toEqual({ Bucket: 'test-bucket', Key: key });
    stream.destroy();
  });
  it('reports an object removed from storage as missing', async () => {
    mocks.findUnique.mockResolvedValue(asset);
    mocks.send.mockRejectedValue(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));
    await expect(readCloudMedia(key)).rejects.toMatchObject({
      status: 404,
      code: 'IMAGE_NOT_FOUND',
    });
  });
  it('does not expose provider details when storage fails', async () => {
    mocks.findUnique.mockResolvedValue(asset);
    mocks.send.mockRejectedValue(new Error('private-storage-details'));
    await expect(readCloudMedia(key)).rejects.toMatchObject({
      status: 503,
      message: 'Image is temporarily unavailable',
    });
  });
});

describe('cloud media HTTP delivery', () => {
  const app = createApp();
  it('streams registered images with public immutable cache headers', async () => {
    mocks.findUnique.mockResolvedValue(asset);
    mocks.send.mockResolvedValue({ Body: Readable.from([Buffer.from('img')]) });
    const response = await request(app).get('/media/' + key);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/webp');
    expect(response.headers['cache-control']).toContain('immutable');
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(response.body).toEqual(Buffer.from('img'));
  });
  it('closes the object stream for HEAD requests', async () => {
    const stream = Readable.from([Buffer.from('img')]);
    mocks.findUnique.mockResolvedValue(asset);
    mocks.send.mockResolvedValue({ Body: stream });
    const response = await request(app).head('/media/' + key);
    expect(response.status).toBe(200);
    expect(response.headers['content-length']).toBe('3');
    expect(stream.destroyed).toBe(true);
  });
  it('returns a structured missing-image response without bucket access', async () => {
    const response = await request(app).get('/media/' + key.replace('/nft/', '/private/'));
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('IMAGE_NOT_FOUND');
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
