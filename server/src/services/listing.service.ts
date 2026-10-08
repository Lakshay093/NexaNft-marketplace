import type { NFTInput, NFTUpdate } from '@nexanft/contracts';
import type { Prisma } from '@prisma/client';
import { db } from '../models/db';
import { nftInclude, serializeNFT } from '../models/selects';
import { AppError, assertFound } from '../utils/errors';
import { env } from '../config/env';
import { logger } from '../utils/logger';
export async function ownedAsset(
  tx: Prisma.TransactionClient,
  assetId: string,
  userId: string,
  purpose: string,
) {
  const asset = await tx.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.userId !== userId || asset.purpose !== purpose)
    throw new AppError(400, 'INVALID_ASSET', 'Upload an image for this account and purpose');
  return asset;
}
async function validCollection(
  tx: Prisma.TransactionClient,
  id: string | null | undefined,
  userId: string,
) {
  if (!id) return;
  const collection = await tx.collection.findUnique({ where: { id } });
  if (!collection || collection.creatorId !== userId)
    throw new AppError(403, 'COLLECTION_FORBIDDEN', 'Choose a collection you created');
}
export async function createNFT(input: NFTInput, userId: string) {
  return db.$transaction(async (tx) => {
    const asset = await ownedAsset(tx, input.assetId, userId, 'nft');
    await validCollection(tx, input.collectionId, userId);
    const { assetId: _assetId, ...fields } = input;
    const nft = await tx.nFT.create({
      data: { ...fields, imageUrl: asset.url, creatorId: userId, ownerId: userId },
      include: nftInclude(userId),
    });
    await tx.activity.create({ data: { type: 'CREATED', actorId: userId, nftId: nft.id } });
    logger.info({ nftId: nft.id, userId }, 'Listing created');
    return serializeNFT(nft);
  });
}
export async function updateNFT(id: string, input: NFTUpdate, userId: string) {
  return db.$transaction(async (tx) => {
    const nft = await tx.nFT.findFirst({ where: { id, deletedAt: null } });
    assertFound(nft, 'NFT_NOT_FOUND', 'Listing not found');
    if (nft.ownerId !== userId)
      throw new AppError(403, 'FORBIDDEN', 'Only the owner can edit this listing');
    if (input.collectionId !== undefined && input.collectionId !== nft.collectionId)
      await validCollection(tx, input.collectionId, userId);
    const changed = await tx.nFT.updateMany({
      where: { id, ownerId: userId, deletedAt: null },
      data: input,
    });
    if (!changed.count)
      throw new AppError(409, 'LISTING_CHANGED', 'Ownership changed. Refresh the listing.');
    await tx.activity.create({
      data: {
        type: input.status === 'UNLISTED' ? 'UNLISTED' : 'UPDATED',
        actorId: userId,
        nftId: id,
      },
    });
    return serializeNFT(
      await tx.nFT.findUniqueOrThrow({ where: { id }, include: nftInclude(userId) }),
    );
  });
}
export async function deleteNFT(id: string, userId: string) {
  await db.$transaction(async (tx) => {
    const nft = await tx.nFT.findFirst({ where: { id, deletedAt: null } });
    assertFound(nft, 'NFT_NOT_FOUND', 'Listing not found');
    if (nft.ownerId !== userId)
      throw new AppError(403, 'FORBIDDEN', 'Only the owner can remove this listing');
    const changed = await tx.nFT.updateMany({
      where: { id, ownerId: userId, deletedAt: null },
      data: { deletedAt: new Date(), status: 'UNLISTED' },
    });
    if (!changed.count)
      throw new AppError(409, 'LISTING_CHANGED', 'Ownership changed. Refresh the listing.');
    await tx.activity.create({ data: { type: 'UNLISTED', actorId: userId, nftId: id } });
  });
}
export async function demoTransfer(id: string, userId: string) {
  if (!env.ENABLE_DEMO_TRANSFERS)
    throw new AppError(
      403,
      'TRANSFERS_DISABLED',
      'Demo transfers are disabled in this environment',
    );
  return db.$transaction(async (tx) => {
    const nft = await tx.nFT.findFirst({ where: { id, deletedAt: null } });
    assertFound(nft, 'NFT_NOT_FOUND', 'Listing not found');
    if (nft.ownerId === userId)
      throw new AppError(409, 'ALREADY_OWNED', 'You already own this platform record');
    if (nft.status !== 'LISTED')
      throw new AppError(409, 'NOT_LISTED', 'This artwork is no longer listed');
    const changed = await tx.nFT.updateMany({
      where: { id, ownerId: nft.ownerId, status: 'LISTED', deletedAt: null },
      data: { ownerId: userId, status: 'SOLD' },
    });
    if (!changed.count)
      throw new AppError(
        409,
        'LISTING_CHANGED',
        'Another collector acquired this record. Refresh the listing.',
      );
    await tx.activity.create({ data: { type: 'TRANSFERRED', actorId: userId, nftId: id } });
    await tx.notification.createMany({
      data: [
        {
          userId,
          nftId: id,
          title: 'Added to your collection',
          body: `${nft.name} is now assigned to your account. This was a demo transfer, with no payment or blockchain transaction.`,
        },
        {
          userId: nft.ownerId,
          nftId: id,
          title: 'Artwork transferred',
          body: `${nft.name} was acquired in a demo transfer. No payment was processed.`,
        },
      ],
    });
    logger.info({ nftId: id, userId }, 'Demo ownership transfer');
    return serializeNFT(
      await tx.nFT.findUniqueOrThrow({ where: { id }, include: nftInclude(userId) }),
    );
  });
}
