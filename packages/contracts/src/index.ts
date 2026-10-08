import { z } from 'zod';

export const categories = [
  'Art',
  'Photography',
  'Music',
  'Gaming',
  'Collectibles',
  'Virtual Worlds',
] as const;
export const statuses = ['LISTED', 'SOLD', 'UNLISTED'] as const;
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9_]+$/, 'Use letters, numbers and underscores');
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(72)
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/[0-9]/, 'Add a number')
  .regex(/[^a-zA-Z0-9]/, 'Add a symbol');
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80),
    username: usernameSchema,
    email: z.string().trim().toLowerCase().email().max(254),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  });
export const loginSchema = z
  .object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(72) })
  .strict();
export const profileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80).optional(),
    username: usernameSchema.optional(),
    bio: z.string().trim().max(500).optional(),
    avatarAssetId: z.string().uuid().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Provide a profile field');
export const priceSchema = z
  .string()
  .regex(/^\d{1,8}(\.\d{1,6})?$/, 'Use a valid price, up to six decimal places')
  .refine((v) => Number(v) > 0, 'Price must be greater than zero');
export const nftSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().min(10).max(2000),
    assetId: z.string().uuid(),
    price: priceSchema,
    category: z.enum(categories),
    collectionId: z.string().uuid().nullable().optional(),
  })
  .strict();
export const nftUpdateSchema = nftSchema
  .omit({ assetId: true })
  .partial()
  .extend({ status: z.enum(['LISTED', 'UNLISTED']).optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Provide a listing field');
export const collectionSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(10).max(1000),
    assetId: z.string().uuid(),
  })
  .strict();
export const querySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    category: z.enum(categories).optional(),
    minPrice: priceSchema.optional(),
    maxPrice: priceSchema.optional(),
    status: z.enum(statuses).optional(),
    sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'popular']).default('newest'),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((v) => !v.minPrice || !v.maxPrice || Number(v.minPrice) <= Number(v.maxPrice), {
    path: ['maxPrice'],
    message: 'Maximum must exceed minimum',
  });
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type NFTInput = z.infer<typeof nftSchema>;
export type NFTUpdate = z.infer<typeof nftUpdateSchema>;
export type SearchFilters = z.input<typeof querySchema> & { mode?: 'created' | 'owned' };
export interface User {
  id: string;
  fullName: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  createdAt: string;
}
export interface CurrentUser extends User {
  email: string;
}
export interface Collection {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  creator: User;
  _count?: { nfts: number };
  createdAt: string;
}
export interface NFT {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  currency: 'ETH';
  creatorId: string;
  ownerId: string;
  collectionId: string | null;
  category: (typeof categories)[number];
  status: (typeof statuses)[number];
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  creator: User;
  owner: User;
  collection: Collection | null;
  isFavorited: boolean;
}
export interface Activity {
  id: string;
  type: 'CREATED' | 'UPDATED' | 'UNLISTED' | 'TRANSFERRED';
  createdAt: string;
  actor: User;
  nft: { id: string; name: string; imageUrl: string };
}
export interface Notification {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  nftId: string | null;
}
export interface Page {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
  pagination?: Page;
}
export interface ApiError {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string[]>;
  requestId?: string;
}
export interface Session {
  user: CurrentUser;
  accessToken: string;
  refreshToken: string;
}
