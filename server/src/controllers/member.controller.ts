import type { RequestHandler } from 'express';
import { idSchema } from '../validators/auth';
import * as service from '../services/member.service';
import { ok } from '../utils/response';
export const profile: RequestHandler = async (req, res) => {
  ok(
    res,
    await service.updateProfile(idSchema.parse(req.params.id), req.auth!.id, req.body),
    'Profile updated',
  );
};
export const collection: RequestHandler = async (req, res) => {
  ok(res, await service.createCollection(req.auth!.id, req.body), 'Collection created', 201);
};
export const activity: RequestHandler = async (req, res) => {
  const result = await service.activity(req.query);
  ok(res, result.data, 'Marketplace activity', 200, result.pagination);
};
export const notifications: RequestHandler = async (req, res) => {
  const result = await service.notifications(req.auth!.id, req.query);
  ok(res, result.data, 'Notifications retrieved', 200, result.pagination);
};
export const read: RequestHandler = async (req, res) => {
  ok(
    res,
    await service.markRead(req.auth!.id, req.params.id ? idSchema.parse(req.params.id) : undefined),
    'Notifications read',
  );
};
