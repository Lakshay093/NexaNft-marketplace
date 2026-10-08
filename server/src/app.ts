import express from 'express';
import path from 'node:path';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './utils/logger';
import { AppError } from './utils/errors';
import { db } from './models/db';
import { errorHandler } from './middleware/errors';
import { createAuthRoutes } from './routes/auth.routes';
import { marketplaceRoutes } from './routes/marketplace.routes';
import { memberRoutes } from './routes/member.routes';
import { readCloudMedia } from './services/storage.service';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(
    pinoHttp({
      logger,
      genReqId: () => randomUUID(),
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url?.split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  if (env.STORAGE_DRIVER === 'local')
    app.use(
      '/media',
      express.static(path.resolve('.data/storage'), {
        maxAge: '7d',
        immutable: true,
        dotfiles: 'deny',
      }),
    );
  if (env.STORAGE_DRIVER === 's3' && env.STORAGE_DELIVERY === 'proxy') {
    app.use(
      '/media',
      rateLimit({ windowMs: 60000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false }),
    );
    app.get('/media/:userId/:purpose/:filename', async (req, res) => {
      const key = `${req.params.userId}/${req.params.purpose}/${req.params.filename}`;
      const media = await readCloudMedia(key);
      res.set({
        'Content-Type': media.mimeType,
        'Content-Length': String(media.size),
        'Cache-Control': 'public,max-age=31536000,immutable',
        ETag: media.etag,
      });
      if (req.method === 'HEAD') {
        media.stream.destroy();
        res.end();
      } else {
        try {
          await pipeline(media.stream, res);
        } catch {
          if (!res.destroyed) res.destroy();
        }
      }
    });
  }
  const origins = env.CORS_ORIGINS.split(',').map((v) => v.trim());
  app.use(
    cors({
      origin: (origin, cb) =>
        cb(
          origin && !origins.includes(origin)
            ? new AppError(403, 'ORIGIN_DENIED', 'Origin is not allowed')
            : null,
          true,
        ),
    }),
  );
  app.get('/health', async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: 'ok' }, message: 'Healthy' });
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({
          success: false,
          code: 'RATE_LIMITED',
          message: 'Too many requests. Try again shortly.',
        }),
    }),
  );
  app.use(express.json({ limit: '64kb' }));
  app.use('/api/auth', createAuthRoutes());
  app.use('/api', marketplaceRoutes);
  app.use('/api', memberRoutes);
  app.use((_req, _res, next) => next(new AppError(404, 'ROUTE_NOT_FOUND', 'Endpoint not found')));
  app.use(errorHandler);
  return app;
}
