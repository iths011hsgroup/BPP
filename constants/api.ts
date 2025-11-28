// constants/api.ts
import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig ?? (Constants as any).manifest ?? {};

export const API_BASE_URL =
  expoConfig.extra?.apiBaseUrl ?? 'http://bpp-server-production.up.railway.app';
