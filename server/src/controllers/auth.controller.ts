import type { RequestHandler } from 'express';
import { loginSchema, registerSchema } from '@nexanft/contracts';
import * as service from '../services/auth.service';
import { forgotSchema, refreshSchema, resetSchema } from '../validators/auth';
import { ok } from '../utils/response';
import { db } from '../models/db';
import { currentUser } from '../models/selects';
export const register: RequestHandler = async (req, res) => {
  ok(res, await service.register(registerSchema.parse(req.body)), 'Account created', 201);
};
export const login: RequestHandler = async (req, res) => {
  ok(res, await service.login(loginSchema.parse(req.body)), 'Signed in');
};
export const refresh: RequestHandler = async (req, res) => {
  ok(res, await service.refresh(refreshSchema.parse(req.body).refreshToken), 'Session refreshed');
};
export const logout: RequestHandler = async (req, res) => {
  await service.logout(refreshSchema.parse(req.body).refreshToken);
  ok(res, null, 'Signed out');
};
export const forgot: RequestHandler = async (req, res) => {
  await service.forgotPassword(forgotSchema.parse(req.body).email);
  ok(res, null, 'If that email is registered, a recovery link has been sent.');
};
export const reset: RequestHandler = async (req, res) => {
  const input = resetSchema.parse(req.body);
  await service.resetPassword(input.token, input.password);
  ok(res, null, 'Password updated. Sign in again.');
};
export const me: RequestHandler = async (req, res) => {
  ok(res, await db.user.findUniqueOrThrow({ where: { id: req.auth!.id }, select: currentUser }));
};
