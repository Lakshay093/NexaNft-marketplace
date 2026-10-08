import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config({ quiet: true });
const flag = z.enum(['true', 'false']).transform((v) => v === 'true');
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8081'),
    TRUST_PROXY: z.coerce.number().int().min(0).max(3).default(0),
    ENABLE_DEMO_TRANSFERS: flag.default('false'),
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_DELIVERY: z.enum(['public', 'proxy']).default('public'),
    STORAGE_ENDPOINT: z.string().optional(),
    STORAGE_REGION: z.string().default('us-east-1'),
    STORAGE_ACCESS_KEY: z.string().optional(),
    STORAGE_SECRET_KEY: z.string().optional(),
    STORAGE_BUCKET: z.string().default('nexanft'),
    STORAGE_PUBLIC_URL: z.string().url(),
    STORAGE_FORCE_PATH_STYLE: flag.default('false'),
    RESET_URL: z.string().default('nexanft://reset-password'),
    MAIL_PROVIDER: z.enum(['smtp', 'brevo']).default('smtp'),
    MAIL_FROM_EMAIL: z.string().email().optional(),
    MAIL_FROM_NAME: z.string().min(1).default('NexaNFT'),
    BREVO_API_KEY: z.string().min(1).optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default('NexaNFT <hello@example.com>'),
  })
  .superRefine((v, c) => {
    if (v.NODE_ENV === 'production') {
      if (v.JWT_SECRET.includes('replace-with'))
        c.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'Replace the example secret' });
      if (v.STORAGE_DRIVER !== 's3')
        c.addIssue({
          code: 'custom',
          path: ['STORAGE_DRIVER'],
          message: 'Production requires cloud storage',
        });
      if (v.MAIL_PROVIDER === 'smtp' && !v.SMTP_HOST)
        c.addIssue({
          code: 'custom',
          path: ['SMTP_HOST'],
          message: 'Production requires mail delivery',
        });
      if (!v.STORAGE_PUBLIC_URL.startsWith('https://'))
        c.addIssue({
          code: 'custom',
          path: ['STORAGE_PUBLIC_URL'],
          message: 'Production media must use HTTPS',
        });
      if (v.CORS_ORIGINS.split(',').some((o) => !o.trim().startsWith('https://')))
        c.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message: 'Production origins must use HTTPS',
        });
    }
    if (v.STORAGE_DRIVER === 's3' && (!v.STORAGE_ACCESS_KEY || !v.STORAGE_SECRET_KEY))
      c.addIssue({
        code: 'custom',
        path: ['STORAGE_ACCESS_KEY'],
        message: 'Cloud storage credentials are required',
      });
    if (v.MAIL_PROVIDER === 'brevo' && (!v.BREVO_API_KEY || !v.MAIL_FROM_EMAIL))
      c.addIssue({
        code: 'custom',
        path: ['BREVO_API_KEY'],
        message: 'Brevo requires an API key and verified MAIL_FROM_EMAIL',
      });
  });
const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw new Error(
    `Invalid environment: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
  );
export const env = parsed.data;
