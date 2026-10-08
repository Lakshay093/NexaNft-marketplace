import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as service from '../services/marketplace.service';
import { idSchema } from '../validators/auth';
import { ok } from '../utils/response';
export const nfts: RequestHandler = async (req, res) => {
  const result = await service.listNFTs(req.query, req.auth?.id);
  ok(res, result.data, 'Listings retrieved', 200, result.pagination);
};
export const detail: RequestHandler = async (req, res) => {
  ok(res, await service.nftDetail(idSchema.parse(req.params.id), req.auth?.id));
};
export const collections: RequestHandler = async (req, res) => {
  const result = await service.listCollections(req.query);
  ok(res, result.data, 'Collections retrieved', 200, result.pagination);
};
export const collection: RequestHandler = async (req, res) => {
  ok(res, await service.collectionDetail(idSchema.parse(req.params.id)));
};
export const collectionNFTs: RequestHandler = async (req, res) => {
  const id = idSchema.parse(req.params.id);
  await service.collectionDetail(id);
  const result = await service.listNFTs(req.query, req.auth?.id, { collectionId: id });
  ok(res, result.data, 'Collection listings', 200, result.pagination);
};
export const creators: RequestHandler = async (req, res) => {
  const result = await service.listCreators(req.query);
  ok(res, result.data, 'Creators retrieved', 200, result.pagination);
};
export const user: RequestHandler = async (req, res) => {
  ok(res, await service.userDetail(idSchema.parse(req.params.id)));
};
export const userNFTs: RequestHandler = async (req, res) => {
  const id = idSchema.parse(req.params.id),
    mode = z.enum(['created', 'owned']).default('created').parse(req.query.mode);
  await service.userDetail(id);
  const result = await service.listNFTs(
    req.query,
    req.auth?.id,
    mode === 'created' ? { creatorId: id } : { ownerId: id },
  );
  ok(res, result.data, 'User listings', 200, result.pagination);
};
