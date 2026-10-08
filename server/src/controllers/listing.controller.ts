import type { RequestHandler } from 'express';
import { z } from 'zod';
import { nftSchema, nftUpdateSchema } from '@nexanft/contracts';
import { idSchema } from '../validators/auth';
import * as listing from '../services/listing.service';
import { upload } from '../services/storage.service';
import { ok } from '../utils/response';
export const create: RequestHandler = async (req, res) => {
  ok(res, await listing.createNFT(nftSchema.parse(req.body), req.auth!.id), 'Listing created', 201);
};
export const update: RequestHandler = async (req, res) => {
  ok(
    res,
    await listing.updateNFT(
      idSchema.parse(req.params.id),
      nftUpdateSchema.parse(req.body),
      req.auth!.id,
    ),
    'Listing updated',
  );
};
export const remove: RequestHandler = async (req, res) => {
  await listing.deleteNFT(idSchema.parse(req.params.id), req.auth!.id);
  ok(res, null, 'Listing removed');
};
export const transfer: RequestHandler = async (req, res) => {
  z.object({ acknowledgeDemo: z.literal(true) })
    .strict()
    .parse(req.body);
  ok(
    res,
    await listing.demoTransfer(idSchema.parse(req.params.id), req.auth!.id),
    'Demo transfer complete. No payment or blockchain transaction.',
  );
};
export const image: RequestHandler = async (req, res) => {
  const purpose = z.enum(['nft', 'avatar', 'collection']).parse(req.body.purpose);
  ok(res, await upload(req.file, req.auth!.id, purpose), 'Image uploaded', 201);
};
