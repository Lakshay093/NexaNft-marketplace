import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { categories } from '@nexanft/contracts';
import { db } from '../src/models/db';
import { env } from '../src/config/env';
const uuid = (label: string) => {
  const h = createHash('sha256').update(label).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const artists = [
  ['mira_chen', 'Mira Chen', 'Sculpting quiet worlds with light and code.'],
  ['arun_studio', 'Arun Kapoor', 'Color, motion, and the spaces in between.'],
  ['lakshay_dhiman', 'Lakshay Dhiman', 'Digital art, independent expression, and imagined worlds.'],
  ['lin_afterhours', 'Lin Park', 'Digital landscapes for the daydreamers.'],
] as const;
// Preserve the existing creator ID so the rename keeps listings, collections, and activity.
const artistId = (index: number) =>
  index === 2 ? '6351467a-887e-4e31-acf6-9111333f669b' : uuid(artists[index]![0]);
const collections = ['Chromatic Dreams', 'Future Relics', 'After Hours', 'Parallel Worlds'];
const titles = [
  'Soft Orbit',
  'Liquid Memory',
  'Beyond the Blue',
  'First Light',
  'Velvet Horizon',
  'Emerald Echo',
  'Solar Drift',
  'Quiet Gravity',
  'Neon Reverie',
  'Still Tomorrow',
  'Opal Frequency',
  'Desert Bloom',
  'Wavelength',
  'Golden Hour',
  'Inner Space',
  'Digital Eden',
  'Slow Motion',
  'Electric Silence',
  'Another Earth',
  'Purple Rain',
  'Cloud Archive',
  'Prism Garden',
  'Lunar Sketch',
  'Infinite Summer',
];
const palettes = [
  ['#191531', '#af9df7', '#e6bb8a'],
  ['#142e30', '#7ddec2', '#efff90'],
  ['#331b25', '#f68b78', '#d9a7f3'],
  ['#172239', '#7baaff', '#eeb4d8'],
];
async function main() {
  if (env.NODE_ENV === 'production' || env.STORAGE_DRIVER !== 'local')
    throw new Error('Demo seeding is restricted to development with local storage.');
  const dataDir = path.resolve('.data');
  await mkdir(path.join(dataDir, 'storage', 'seed'), { recursive: true });
  const credentialsPath = path.join(dataDir, 'demo-credentials.json');
  let savedPassword: string | undefined;
  try {
    savedPassword = (JSON.parse(await readFile(credentialsPath, 'utf8')) as { password: string })
      .password;
  } catch {
    /* First seed */
  }
  const password =
    process.env.SEED_PASSWORD ?? savedPassword ?? `Nexa!${randomBytes(14).toString('hex')}Aa1`;
  const passwordHash = await bcrypt.hash(password, 12);
  for (const [index, [username, fullName, bio]] of artists.entries()) {
    await db.user.upsert({
      where: { id: artistId(index) },
      update: {
        bio,
        ...(index === 2 ? { username, fullName, email: `${username}@nexanft.example` } : {}),
      },
      create: {
        id: artistId(index),
        username,
        fullName,
        bio,
        email: `${username}@nexanft.example`,
        passwordHash,
      },
    });
  }
  for (let i = 0; i < titles.length; i++) {
    const palette = palettes[i % 4]!,
      [bg, one, two] = palette;
    const phase = i * 19;
    const rings = Array.from(
      { length: 8 },
      (_, n) =>
        `<ellipse cx="400" cy="${390 + n * 15}" rx="${240 - n * 18}" ry="${120 - n * 9}" fill="none" stroke="${n % 2 ? one : two}" stroke-width="${18 - n}" transform="rotate(${phase} 400 400)"/>`,
    ).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><defs><radialGradient id="g"><stop stop-color="${two}"/><stop offset=".55" stop-color="${one}"/><stop offset="1" stop-color="${bg}"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="35"/></filter><linearGradient id="l" x2="1" y2="1"><stop stop-color="${one}"/><stop offset="1" stop-color="${two}"/></linearGradient></defs><rect width="800" height="800" fill="${bg}"/><circle cx="${200 + i * 13}" cy="260" r="200" fill="${one}" opacity=".23" filter="url(#b)"/><circle cx="580" cy="610" r="240" fill="${two}" opacity=".2" filter="url(#b)"/>${i % 3 === 0 ? `<circle cx="400" cy="385" r="230" fill="url(#g)"/><ellipse cx="400" cy="664" rx="160" ry="20" fill="#000" opacity=".3" filter="url(#b)"/>` : i % 3 === 1 ? rings : `<rect x="228" y="200" width="345" height="345" rx="90" fill="url(#l)" transform="rotate(${20 + (phase % 35)} 400 400)"/><circle cx="340" cy="310" r="65" fill="${bg}" opacity=".9"/>`}<text x="42" y="754" fill="${two}" font-family="sans-serif" font-size="16" letter-spacing="5">NEXA / ${String(i + 1).padStart(2, '0')}</text></svg>`;
    const key = `seed/art-${i + 1}.png`;
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(dataDir, 'storage', key));
    const creatorId = artistId(i % 4),
      collectionId = uuid(`collection-${i % 4}`),
      imageUrl = `${env.STORAGE_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
    if (i < 4)
      await db.collection.upsert({
        where: { id: collectionId },
        update: { imageUrl },
        create: {
          id: collectionId,
          name: collections[i % 4]!,
          description:
            'An ongoing exploration of digital form, independent expression, and imagined worlds.',
          imageUrl,
          creatorId,
        },
      });
    const id = uuid(`nft-${i}`);
    const price = ((i + 1) * 0.137).toFixed(3);
    await db.nFT.upsert({
      where: { id },
      update: { imageUrl },
      create: {
        id,
        name: titles[i]!,
        description: `${titles[i]} is an original study in light, texture, and digital possibility. Created for the ${collections[i % 4]} series. Development artwork generated locally; marketplace ownership is a platform record.`,
        imageUrl,
        price,
        creatorId,
        ownerId: creatorId,
        collectionId,
        category: categories[i % categories.length]!,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    });
    await db.activity.upsert({
      where: { id: uuid(`activity-${i}`) },
      update: {},
      create: { id: uuid(`activity-${i}`), type: 'CREATED', actorId: creatorId, nftId: id },
    });
  }
  await writeFile(
    credentialsPath,
    JSON.stringify({ email: `${artists[0][0]}@nexanft.example`, password }, null, 2),
    { mode: 0o600 },
  );
  console.info(
    'Seeded four creators, four collections, and 24 original artworks. Local demo credentials: server/.data/demo-credentials.json',
  );
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Seed failed');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
