export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export function resolveMediaUrl(uri: string, apiUrl = API_URL): string {
  try {
    const media = new URL(uri);
    const api = new URL(apiUrl);
    if (
      api.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(media.hostname) &&
      media.port === api.port &&
      media.pathname.startsWith('/media/')
    ) {
      media.host = api.host;
      return media.toString();
    }
  } catch {
    // Leave device URIs and malformed URLs to the image component's normal fallback.
  }
  return uri;
}
