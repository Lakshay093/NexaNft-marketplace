import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../models/db';
import { AppError } from '../utils/errors';
export const authenticate =
  (required = true): RequestHandler =>
  async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header) {
        if (required) throw new AppError(401, 'UNAUTHORIZED', 'Sign in to continue');
        return next();
      }
      if (!header.startsWith('Bearer '))
        throw new AppError(401, 'UNAUTHORIZED', 'Invalid authorization header');
      const decoded = jwt.verify(header.slice(7), env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'nexanft',
        audience: 'nexanft-mobile',
      });
      if (
        typeof decoded === 'string' ||
        typeof decoded.sub !== 'string' ||
        typeof decoded.sid !== 'string' ||
        typeof decoded.ver !== 'number'
      )
        throw new AppError(401, 'UNAUTHORIZED', 'Invalid session claims');
      const user = await db.user.findUnique({
        where: { id: decoded.sub },
        select: { tokenVersion: true },
      });
      const active = await db.refreshToken.findFirst({
        where: {
          userId: decoded.sub,
          familyId: decoded.sid,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!user || user.tokenVersion !== decoded.ver || !active)
        throw new AppError(401, 'SESSION_EXPIRED', 'Your session expired. Sign in again.');
      req.auth = { id: decoded.sub, familyId: decoded.sid };
      next();
    } catch (err) {
      next(
        err instanceof AppError
          ? err
          : err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError
            ? new AppError(401, 'SESSION_EXPIRED', 'Your session expired. Sign in again.')
            : err,
      );
    }
  };
