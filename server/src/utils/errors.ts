export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function assertFound<T>(
  value: T | null | undefined,
  code = 'NOT_FOUND',
  message = 'Record not found',
): asserts value is T {
  if (value === null || value === undefined) throw new AppError(404, code, message);
}
