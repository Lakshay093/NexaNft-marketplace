import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({
  MAIL_PROVIDER: 'brevo',
  MAIL_FROM_NAME: 'NexaNFT',
  MAIL_FROM_EMAIL: 'verified@example.test',
  BREVO_API_KEY: 'test-only-api-key',
  RESET_URL: 'nexanft://reset-password',
}));
vi.mock('../src/config/env', () => ({ env: config }));
import { sendResetMail } from '../src/services/mail.service';

describe('HTTPS recovery email delivery', () => {
  const fetchMail = vi.fn<typeof fetch>();
  beforeEach(() => vi.stubGlobal('fetch', fetchMail));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMail.mockReset();
  });
  it('uses the verified sender and encodes a native recovery link', async () => {
    fetchMail.mockResolvedValue(
      new Response(JSON.stringify({ messageId: 'accepted-message' }), { status: 201 }),
    );
    await sendResetMail('recipient@example.test', 'token&special');
    const [endpoint, options] = fetchMail.mock.calls[0];
    expect(endpoint).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options?.redirect).toBe('error');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(options?.headers).toEqual({
      'Content-Type': 'application/json',
      'api-key': config.BREVO_API_KEY,
    });
    const message = JSON.parse(String(options?.body));
    expect(message.sender).toEqual({ name: 'NexaNFT', email: config.MAIL_FROM_EMAIL });
    expect(message.to).toEqual([{ email: 'recipient@example.test' }]);
    expect(message.textContent).toContain('nexanft://reset-password?token=token%26special');
    expect(message.htmlContent).toContain('token%26special');
  });
  it.each([401, 429, 500])(
    'reports provider rejection %i without leaking its response',
    async (status) => {
      fetchMail.mockResolvedValue(new Response('private-provider-details', { status }));
      await expect(sendResetMail('recipient@example.test', 'token')).rejects.toMatchObject({
        status: 503,
        code: 'MAIL_UNAVAILABLE',
      });
    },
  );
  it('does not report success for malformed provider confirmation', async () => {
    fetchMail.mockResolvedValue(new Response('{}', { status: 201 }));
    await expect(sendResetMail('recipient@example.test', 'token')).rejects.toMatchObject({
      code: 'MAIL_UNAVAILABLE',
    });
  });
  it('handles network failure without exposing the API key', async () => {
    fetchMail.mockRejectedValue(new Error(config.BREVO_API_KEY));
    await expect(sendResetMail('recipient@example.test', 'token')).rejects.toMatchObject({
      status: 503,
      message: 'Recovery email could not be sent. Try again shortly.',
    });
  });
});
