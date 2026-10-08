import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
export async function sendResetMail(email: string, token: string) {
  const url = new URL(env.RESET_URL);
  url.searchParams.set('token', token);
  const text = `Reset your NexaNFT password: ${url.toString()}\nThis single-use link expires in 30 minutes. If you did not request it, ignore this email.`;
  if (env.MAIL_PROVIDER === 'brevo') {
    try {
      const escapedUrl = url
        .toString()
        .replace(
          /[&<>"']/g,
          (character) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
        );
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', 'api-key': env.BREVO_API_KEY! },
        body: JSON.stringify({
          sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM_EMAIL },
          replyTo: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM_EMAIL },
          to: [{ email }],
          subject: 'Reset your NexaNFT password',
          textContent: text,
          htmlContent: `<p><a href="${escapedUrl}">Reset your NexaNFT password</a></p><p>This single-use link expires in 30 minutes. If you did not request it, ignore this email.</p>`,
        }),
      });
      if (!response.ok) throw new Error('Mail provider rejected the request');
      const result: unknown = await response.json();
      if (
        !result ||
        typeof result !== 'object' ||
        !('messageId' in result) ||
        typeof result.messageId !== 'string' ||
        !result.messageId
      )
        throw new Error('Mail provider did not confirm acceptance');
    } catch {
      throw new AppError(
        503,
        'MAIL_UNAVAILABLE',
        'Recovery email could not be sent. Try again shortly.',
      );
    }
  } else if (env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: 'Reset your NexaNFT password',
      text,
    });
  } else {
    const dir = path.resolve('.data/outbox');
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, `${randomUUID()}.eml`),
      `To: ${email}\nSubject: Reset your NexaNFT password\n\n${text}`,
      { mode: 0o600 },
    );
  }
}
