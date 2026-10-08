import { profileSchema, collectionSchema, querySchema } from '@nexanft/contracts';
import { db } from '../models/db';
import { ownedAsset } from './listing.service';
import { currentUser, collectionInclude, publicUser } from '../models/selects';
import { AppError } from '../utils/errors';
export async function updateProfile(id: string, userId: string, raw: unknown) {
  if (id !== userId) throw new AppError(403, 'FORBIDDEN', 'You can only edit your own profile');
  const { avatarAssetId, ...fields } = profileSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const avatar = avatarAssetId
      ? await ownedAsset(tx, avatarAssetId, userId, 'avatar')
      : undefined;
    return tx.user.update({
      where: { id: userId },
      data: { ...fields, ...(avatar ? { avatarUrl: avatar.url } : {}) },
      select: currentUser,
    });
  });
}
export async function createCollection(userId: string, raw: unknown) {
  const { assetId, ...fields } = collectionSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const asset = await ownedAsset(tx, assetId, userId, 'collection');
    return tx.collection.create({
      data: { ...fields, creatorId: userId, imageUrl: asset.url },
      include: collectionInclude,
    });
  });
}
export async function activity(raw: unknown) {
  const { page, limit } = querySchema.parse(raw);
  const where = { nft: { deletedAt: null } };
  const [data, total] = await db.$transaction([
    db.activity.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      include: {
        actor: { select: publicUser },
        nft: { select: { id: true, name: true, imageUrl: true } },
      },
    }),
    db.activity.count({ where }),
  ]);
  return { data, pagination: { page, limit, total } };
}
export async function notifications(userId: string, raw: unknown) {
  const { page, limit } = querySchema.parse(raw),
    where = { userId };
  const [data, total] = await db.$transaction([
    db.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    db.notification.count({ where }),
  ]);
  return { data, pagination: { page, limit, total } };
}
export async function markRead(userId: string, id?: string) {
  const changed = await db.notification.updateMany({
    where: { userId, ...(id ? { id } : {}) },
    data: { readAt: new Date() },
  });
  if (id && !changed.count)
    throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  return { count: changed.count };
}
