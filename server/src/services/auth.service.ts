import { randomBytes, randomUUID, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Prisma } from '@prisma/client';
import type { RegisterInput, LoginInput } from '@nexanft/contracts';
import { db } from '../models/db';
import { currentUser } from '../models/selects';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { sendResetMail } from './mail.service';
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
function validatePasswordBytes(password: string) {
  if (Buffer.byteLength(password, 'utf8') > 72)
    throw new AppError(400, 'PASSWORD_TOO_LONG', 'Use a password of at most 72 UTF-8 bytes');
}
function accessToken(user: { id: string; tokenVersion: number }, familyId: string) {
  return jwt.sign({ ver: user.tokenVersion, sid: familyId }, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: 'nexanft',
    audience: 'nexanft-mobile',
    expiresIn: '15m',
  });
}
async function createSession(
  tx: Prisma.TransactionClient,
  userId: string,
  familyId: string = randomUUID(),
  expiresAt = new Date(Date.now() + 30 * 86400000),
) {
  const refreshToken = randomBytes(48).toString('hex');
  await tx.refreshToken.create({
    data: { tokenHash: tokenHash(refreshToken), userId, familyId, expiresAt },
  });
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { ...currentUser, tokenVersion: true },
  });
  const { tokenVersion: _version, ...safeUser } = user;
  return { user: safeUser, accessToken: accessToken(user, familyId), refreshToken };
}
export async function register(input: RegisterInput) {
  validatePasswordBytes(input.password);
  const passwordHash = await bcrypt.hash(input.password, 12);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName: input.fullName,
        username: input.username,
        email: input.email,
        passwordHash,
      },
    });
    const session = await createSession(tx, user.id);
    logger.info({ userId: user.id }, 'User registered');
    return session;
  });
}
export async function login(input: LoginInput) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? '$2b$12$3h.Mjm9SW64MzrKrOJRGD.VK6.wRKFIOw3CK03TvOd75UGDSHG7oS',
  );
  if (!user || !valid) {
    logger.warn('Authentication failed');
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  return db.$transaction((tx) => createSession(tx, user.id));
}
export async function refresh(token: string) {
  const old = await db.refreshToken.findUnique({ where: { tokenHash: tokenHash(token) } });
  if (!old || old.expiresAt <= new Date())
    throw new AppError(401, 'SESSION_EXPIRED', 'Sign in again');
  const result = await db.$transaction(async (tx) => {
    const changed = await tx.refreshToken.updateMany({
      where: { id: old.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (changed.count === 0) {
      await tx.refreshToken.updateMany({
        where: { familyId: old.familyId },
        data: { revokedAt: new Date() },
      });
      return null;
    }
    return createSession(tx, old.userId, old.familyId, old.expiresAt);
  });
  if (!result) {
    logger.warn({ userId: old.userId }, 'Refresh token replay detected');
    throw new AppError(401, 'SESSION_EXPIRED', 'Sign in again');
  }
  return result;
}
export async function logout(token: string) {
  const old = await db.refreshToken.findUnique({ where: { tokenHash: tokenHash(token) } });
  if (old)
    await db.refreshToken.updateMany({
      where: { familyId: old.familyId },
      data: { revokedAt: new Date() },
    });
}
export async function forgotPassword(email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;
  const token = randomBytes(32).toString('hex');
  await db.$transaction(async (tx) => {
    await tx.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + 30 * 60000),
      },
    });
  });
  await sendResetMail(user.email, token);
}
export async function resetPassword(token: string, password: string) {
  const reset = await db.passwordReset.findUnique({ where: { tokenHash: tokenHash(token) } });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date())
    throw new AppError(400, 'INVALID_RESET', 'This recovery link expired. Request another.');
  validatePasswordBytes(password);
  const passwordHash = await bcrypt.hash(password, 12);
  const changed = await db.$transaction(async (tx) => {
    const claimed = await tx.passwordReset.updateMany({
      where: { id: reset.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (!claimed.count) return false;
    await tx.user.update({
      where: { id: reset.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await tx.refreshToken.updateMany({
      where: { userId: reset.userId },
      data: { revokedAt: new Date() },
    });
    return true;
  });
  if (!changed) throw new AppError(400, 'INVALID_RESET', 'Recovery link already used');
}
