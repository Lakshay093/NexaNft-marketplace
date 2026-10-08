import { describe, expect, it } from 'vitest';
import { resolveMediaUrl } from '../constants/config';

describe('device-accessible development media', () => {
  it('loads development artwork through the same LAN host as the API', () => {
    expect(
      resolveMediaUrl(
        'http://localhost:4000/media/seed/art-1.png',
        'http://192.168.0.105:4000/api',
      ),
    ).toBe('http://192.168.0.105:4000/media/seed/art-1.png');
    expect(
      resolveMediaUrl('http://127.0.0.1:4000/media/avatar.webp', 'http://10.0.2.2:4000/api'),
    ).toBe('http://10.0.2.2:4000/media/avatar.webp');
  });

  it('keeps cloud media and other local services at their original addresses', () => {
    const api = 'http://192.168.0.105:4000/api';
    for (const uri of [
      'https://cdn.example.com/art.webp',
      'http://localhost:9000/media/art.webp',
      'file:///photos/art.jpg',
    ]) {
      expect(resolveMediaUrl(uri, api)).toBe(uri);
    }
  });

  it('does not reinterpret a local media URL as production cloud content', () => {
    const uri = 'http://localhost:4000/media/seed/art-1.png';
    expect(resolveMediaUrl(uri, 'https://api.example.com/api')).toBe(uri);
  });
});
