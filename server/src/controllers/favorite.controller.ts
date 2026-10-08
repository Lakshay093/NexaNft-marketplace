import type { RequestHandler } from 'express';
import { idSchema } from '../validators/auth';
import * as service from '../services/favorite.service';
import { ok } from '../utils/response';
export const favorite: RequestHandler = async (req, res) => {
  ok(
    res,
    await service.setFavorite(idSchema.parse(req.params.id), req.auth!.id, req.method === 'POST'),
    'Favorites updated',
  );
};
export const favorites: RequestHandler = async (req, res) => {
  const result = await service.favorites(idSchema.parse(req.params.id), req.auth!.id, req.query);
  ok(res, result.data, 'Favorites retrieved', 200, result.pagination);
};
