import axios, { type InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios';
import type { ApiSuccess } from '@nexanft/contracts';
import { sessions, authClient } from './auth';
interface RetriedRequest extends InternalAxiosRequestConfig {
  _retried?: boolean;
}
export const api = axios.create({ baseURL: authClient.defaults.baseURL, timeout: 15000 });
api.interceptors.request.use((config) => {
  if (sessions.accessToken) config.headers.Authorization = `Bearer ${sessions.accessToken}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw error;
    const original = error.config as RetriedRequest | undefined;
    if (error.response?.status === 401 && original && !original._retried && sessions.session) {
      original._retried = true;
      const session = await sessions.refresh();
      original.headers.Authorization = `Bearer ${session.accessToken}`;
      return api(original);
    }
    throw error;
  },
);
export async function request<T>(path: string, config?: AxiosRequestConfig) {
  return (await api.request<ApiSuccess<T>>({ url: path, ...config })).data;
}
