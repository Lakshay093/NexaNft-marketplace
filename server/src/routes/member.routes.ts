import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as favorite from '../controllers/favorite.controller';
import * as listing from '../controllers/listing.controller';
import * as member from '../controllers/member.controller';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
export const memberRoutes = Router();
memberRoutes.post('/nfts/:id/favorite', authenticate(), favorite.favorite);
memberRoutes.delete('/nfts/:id/favorite', authenticate(), favorite.favorite);
memberRoutes.get('/users/:id/favorites', authenticate(), favorite.favorites);
memberRoutes.post('/nfts', authenticate(), listing.create);
memberRoutes.patch('/nfts/:id', authenticate(), listing.update);
memberRoutes.delete('/nfts/:id', authenticate(), listing.remove);
memberRoutes.post('/nfts/:id/demo-transfer', authenticate(), listing.transfer);
memberRoutes.patch('/users/:id', authenticate(), member.profile);
memberRoutes.post('/collections', authenticate(), member.collection);
memberRoutes.get('/activity', member.activity);
memberRoutes.get('/notifications', authenticate(), member.notifications);
memberRoutes.patch('/notifications/read-all', authenticate(), member.read);
memberRoutes.patch('/notifications/:id/read', authenticate(), member.read);
memberRoutes.post(
  '/uploads',
  authenticate(),
  rateLimit({
    windowMs: 3600000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: 'Upload limit reached. Try again later.',
      }),
  }),
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 1, parts: 2 },
  }).single('image'),
  listing.image,
);
