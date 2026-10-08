import pino from 'pino';
import { env } from '../config/env';
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
});
