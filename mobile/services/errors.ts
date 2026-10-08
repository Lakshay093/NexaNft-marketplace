import axios from 'axios';
import type { ApiError } from '@nexanft/contracts';
export function errorMessage(error: unknown) {
  if (axios.isAxiosError<ApiError>(error)) {
    if (error.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
    if (!error.response) return 'Unable to connect. Check your internet connection and try again.';
    return error.response.data?.message ?? 'The server could not complete this request.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export const isUnauthorized = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 401;
