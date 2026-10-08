import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { db } from '../models/db';
import { AppError } from '../utils/errors';
export type AssetPurpose = 'nft' | 'avatar' | 'collection';
const client =
  env.STORAGE_DRIVER === 's3'
    ? new S3Client({
        region: env.STORAGE_REGION,
        endpoint: env.STORAGE_ENDPOINT || undefined,
        forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
        credentials: {
          accessKeyId: env.STORAGE_ACCESS_KEY!,
          secretAccessKey: env.STORAGE_SECRET_KEY!,
        },
      })
    : null;
async function store(key: string, body: Buffer) {
  if (client)
    await client.send(
      new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: key,
        Body: body,
        ContentType: 'image/webp',
        CacheControl: 'public,max-age=31536000,immutable',
      }),
    );
  else {
    const file = path.resolve('.data/storage', key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
}
async function remove(key: string) {
  if (client) await client.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
  else await unlink(path.resolve('.data/storage', key)).catch(() => {});
}
export async function readCloudMedia(key: string) {
  const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
  if (!client || !new RegExp(`^${uuid}/(?:nft|avatar|collection)/${uuid}\\.webp$`).test(key))
    throw new AppError(404, 'IMAGE_NOT_FOUND', 'Image not found');
  const asset = await db.asset.findUnique({
    where: { key },
    select: { id: true, size: true, mimeType: true },
  });
  if (!asset) throw new AppError(404, 'IMAGE_NOT_FOUND', 'Image not found');
  try {
    const object = await client.send(
      new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
    );
    if (!(object.Body instanceof Readable)) throw new Error('Image stream is unavailable');
    return {
      stream: object.Body,
      size: asset.size,
      mimeType: asset.mimeType,
      etag: `"${asset.id}"`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchKey')
      throw new AppError(404, 'IMAGE_NOT_FOUND', 'Image not found');
    throw new AppError(503, 'IMAGE_UNAVAILABLE', 'Image is temporarily unavailable');
  }
}
export async function upload(
  file: Express.Multer.File | undefined,
  userId: string,
  purpose: AssetPurpose,
) {
  if (!file) throw new AppError(400, 'IMAGE_REQUIRED', 'Choose an image');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
    throw new AppError(400, 'INVALID_IMAGE', 'Use a JPEG, PNG, or WebP image');
  let encoded: Buffer;
  try {
    const image = sharp(file.buffer, {
        limitInputPixels: 32000000,
        animated: false,
        failOn: 'warning',
      }),
      metadata = await image.metadata();
    const allowed: Record<string, string> = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    if (!metadata.format || allowed[metadata.format] !== file.mimetype || (metadata.pages ?? 1) > 1)
      throw new Error('Unsupported content');
    encoded = await image
      .rotate()
      .resize({
        width: purpose === 'avatar' ? 512 : 2000,
        height: purpose === 'avatar' ? 512 : 2000,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new AppError(
      400,
      'INVALID_IMAGE',
      'This image could not be read. Use a valid JPEG, PNG, or WebP.',
    );
  }
  const key = `${userId}/${purpose}/${randomUUID()}.webp`,
    url = `${env.STORAGE_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  await store(key, encoded);
  try {
    const asset = await db.asset.create({
      data: { userId, purpose, key, url, mimeType: 'image/webp', size: encoded.length },
    });
    return { id: asset.id, url: asset.url, size: asset.size };
  } catch (err) {
    await remove(key);
    throw err;
  }
}
