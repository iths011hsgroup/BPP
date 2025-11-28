// constants/api.ts
import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig ?? (Constants as any).manifest ?? {};

export const rawBaseUrl =
  expoConfig.extra?.apiBaseUrl ?? 'https://bpp-server-production.up.railway.app';

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');