import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { querySchema } from '@nexanft/contracts';
import { db } from '../models/db';
import { nftInclude, serializeNFT, publicUser, collectionInclude } from '../models/selects';
import { assertFound } from '../utils/errors';
export async function listNFTs(raw: unknown, userId?: string, extra: Prisma.NFTWhereInput = {}) {
  const query = querySchema.parse(raw);
  const { page, limit, q, category, status, minPrice, maxPrice, sort } = query;
  const where: Prisma.NFTWhereInput = {
    AND: [
      { deletedAt: null },
      extra,
      {
        ...(category ? { category } : {}),
        ...(status ? { status } : {}),
        ...(minPrice || maxPrice
          ? {
              price: {
                ...(minPrice ? { gte: new Prisma.Decimal(minPrice) } : {}),
                ...(maxPrice ? { lte: new Prisma.Decimal(maxPrice) } : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
                { creator: { username: { contains: q, mode: 'insensitive' } } },
                { creator: { fullName: { contains: q, mode: 'insensitive' } } },
                { collection: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
    ],
  };
  const order: Prisma.NFTOrderByWithRelationInput =
    sort === 'popular'
      ? { favorites: { _count: 'desc' } }
      : sort.startsWith('price_')
        ? { price: sort === 'price_asc' ? 'asc' : 'desc' }
        : { createdAt: sort === 'oldest' ? 'asc' : 'desc' };
  const [rows, total] = await db.$transaction([
    db.nFT.findMany({
      where,
      orderBy: [order, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: nftInclude(userId),
    }),
    db.nFT.count({ where }),
  ]);
  return { data: rows.map(serializeNFT), pagination: { page, limit, total } };
}
export async function nftDetail(id: string, userId?: string) {
  const changed = await db.nFT.updateMany({
    where: { id, deletedAt: null },
    data: { viewsCount: { increment: 1 } },
  });
  assertFound(changed.count || null, 'NFT_NOT_FOUND', 'This listing was not found');
  const nft = await db.nFT.findUnique({ where: { id }, include: nftInclude(userId) });
  assertFound(nft);
  return serializeNFT(nft);
}
export async function listCollections(raw: unknown) {
  const { page, limit } = querySchema.parse(raw);
  const { creatorId } = z.object({ creatorId: z.string().uuid().optional() }).parse(raw);
  const where = creatorId ? { creatorId } : {};
  const [data, total] = await db.$transaction([
    db.collection.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ nfts: { _count: 'desc' } }, { id: 'asc' }],
      include: collectionInclude,
    }),
    db.collection.count({ where }),
  ]);
  return { data, pagination: { page, limit, total } };
}
export async function collectionDetail(id: string) {
  const data = await db.collection.findUnique({ where: { id }, include: collectionInclude });
  assertFound(data, 'COLLECTION_NOT_FOUND', 'Collection not found');
  return data;
}
export async function listCreators(raw: unknown) {
  const { page, limit } = querySchema.parse(raw);
  const where = { createdNFTs: { some: { deletedAt: null } } };
  const [data, total] = await db.$transaction([
    db.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdNFTs: { _count: 'desc' } }, { id: 'asc' }],
      select: {
        ...publicUser,
        _count: { select: { createdNFTs: { where: { deletedAt: null } } } },
      },
    }),
    db.user.count({ where }),
  ]);
  return { data, pagination: { page, limit, total } };
}
export async function userDetail(id: string) {
  const data = await db.user.findUnique({
    where: { id },
    select: {
      ...publicUser,
      _count: {
        select: {
          createdNFTs: { where: { deletedAt: null } },
          ownedNFTs: { where: { deletedAt: null } },
          favorites: { where: { nft: { deletedAt: null } } },
        },
      },
    },
  });
  assertFound(data, 'USER_NOT_FOUND', 'Creator not found');
  return data;
}
