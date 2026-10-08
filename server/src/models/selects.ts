import type { Prisma } from '@prisma/client';
export const publicUser = {
  id: true,
  username: true,
  fullName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
export const currentUser = { ...publicUser, email: true } satisfies Prisma.UserSelect;
export const collectionInclude = {
  creator: { select: publicUser },
  _count: { select: { nfts: { where: { deletedAt: null } } } },
} satisfies Prisma.CollectionInclude;
export const nftInclude = (userId?: string) =>
  ({
    creator: { select: publicUser },
    owner: { select: publicUser },
    collection: { include: collectionInclude },
    _count: { select: { favorites: true } },
    favorites: {
      where: { userId: userId ?? '00000000-0000-0000-0000-000000000000' },
      select: { userId: true },
    },
  }) satisfies Prisma.NFTInclude;
export type NFTRecord = Prisma.NFTGetPayload<{ include: ReturnType<typeof nftInclude> }>;
export function serializeNFT(nft: NFTRecord) {
  const { _count, favorites, deletedAt: _deletedAt, ...rest } = nft;
  return {
    ...rest,
    price: nft.price.toFixed(6).replace(/\.?0+$/, ''),
    likesCount: _count.favorites,
    isFavorited: favorites.length > 0,
  };
}
