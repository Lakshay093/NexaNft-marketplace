import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
export function createAuthRoutes() {
  const routes = Router();
  const attempts = rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts. Try again later.',
      }),
  });
  const refreshes = rateLimit({
    windowMs: 60000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: 'Too many session refreshes. Try again shortly.',
      }),
  });
  routes.post('/register', attempts, controller.register);
  routes.post('/login', attempts, controller.login);
  routes.post('/refresh', refreshes, controller.refresh);
  routes.post('/logout', controller.logout);
  routes.post('/forgot-password', attempts, controller.forgot);
  routes.post('/reset-password', attempts, controller.reset);
  routes.get('/me', authenticate(), controller.me);
  return routes;
}
