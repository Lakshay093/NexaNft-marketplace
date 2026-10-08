import type { Response } from 'express';
export const ok = (
  res: Response,
  data: unknown,
  message = 'Success',
  status = 200,
  pagination?: { page: number; limit: number; total: number },
) =>
  res.status(status).json({
    success: true,
    data,
    message,
    ...(pagination
      ? { pagination: { ...pagination, pages: Math.ceil(pagination.total / pagination.limit) } }
      : {}),
  });
