import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import type { ApiSuccess, Session, LoginInput, RegisterInput } from '@nexanft/contracts';
import { SessionManager } from './session';
import { isUnauthorized } from './errors';
import { API_URL } from '../constants/config';
export const authClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
const key = 'nexanft.refresh';
export const sessions = new SessionManager(
  {
    get: async () =>
      Platform.OS === 'web'
        ? typeof sessionStorage === 'undefined'
          ? null
          : sessionStorage.getItem(key)
        : SecureStore.getItemAsync(key),
    set: async (token) => {
      if (Platform.OS === 'web') sessionStorage.setItem(key, token);
      else
        await SecureStore.setItemAsync(key, token, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
    },
    clear: async () => {
      if (Platform.OS === 'web') sessionStorage.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    },
  },
  {
    refresh: async (token) =>
      (await authClient.post<ApiSuccess<Session>>('/auth/refresh', { refreshToken: token })).data
        .data,
    logout: async (token) => {
      await authClient.post('/auth/logout', { refreshToken: token });
    },
    isUnauthorized,
  },
);
export async function signIn(input: LoginInput) {
  const { data } = await authClient.post<ApiSuccess<Session>>('/auth/login', input);
  await sessions.accept(data.data);
}
export async function signUp(input: RegisterInput) {
  const { data } = await authClient.post<ApiSuccess<Session>>('/auth/register', input);
  await sessions.accept(data.data);
}
