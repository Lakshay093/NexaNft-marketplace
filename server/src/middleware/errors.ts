import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import type { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  let status = 500,
    code = 'INTERNAL_ERROR',
    message = 'Something went wrong. Please try again.';
  let errors: Record<string, string[] | undefined> | undefined;
  if (err instanceof AppError) {
    ({ status, code, message } = err);
  } else if (
    err instanceof Error &&
    err.name === 'ZodError' &&
    'flatten' in err &&
    typeof err.flatten === 'function'
  ) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Please check your input';
    errors = (err as ZodError).flatten().fieldErrors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    status = 409;
    code = 'CONFLICT';
    message = 'That email, username, or name is already in use';
  } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    status = 404;
    code = 'NOT_FOUND';
    message = 'Record not found';
  } else if (err instanceof multer.MulterError) {
    status = 400;
    code = 'UPLOAD_ERROR';
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Images must be under 8 MB'
        : 'Upload one image in the image field';
  } else if (err instanceof SyntaxError && 'body' in err) {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON request';
  }
  if (status === 500)
    logger.error(
      { errorType: err instanceof Error ? err.name : 'Unknown', requestId: req.id },
      'Unexpected request error',
    );
  res
    .status(status)
    .json({ success: false, message, code, ...(errors ? { errors } : {}), requestId: req.id });
};
