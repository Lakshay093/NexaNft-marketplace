import { db } from '../models/db';
import { assertFound, AppError } from '../utils/errors';
import { listNFTs } from './marketplace.service';
export async function setFavorite(nftId: string, userId: string, favorite: boolean) {
  const nft = await db.nFT.findFirst({
    where: { id: nftId, deletedAt: null },
    select: { id: true, name: true, creatorId: true },
  });
  assertFound(nft, 'NFT_NOT_FOUND', 'Listing not found');
  if (favorite) {
    const added = await db.favorite.createMany({ data: [{ nftId, userId }], skipDuplicates: true });
    if (added.count && nft.creatorId !== userId)
      await db.notification.create({
        data: {
          userId: nft.creatorId,
          nftId,
          title: 'Someone saved your artwork',
          body: `${nft.name} has a new admirer.`,
        },
      });
  } else await db.favorite.deleteMany({ where: { nftId, userId } });
  return { isFavorited: favorite, likesCount: await db.favorite.count({ where: { nftId } }) };
}
export async function favorites(id: string, userId: string, query: unknown) {
  if (id !== userId) throw new AppError(403, 'FORBIDDEN', 'Favorites are private to their account');
  return listNFTs(query, userId, { favorites: { some: { userId } } });
}
