import { z } from 'zod';
import { passwordSchema } from '@nexanft/contracts';
export const refreshSchema = z
  .object({ refreshToken: z.string().regex(/^[a-f0-9]{96}$/) })
  .strict();
export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() }).strict();
export const resetSchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema })
  .strict();
export const idSchema = z.string().uuid();
