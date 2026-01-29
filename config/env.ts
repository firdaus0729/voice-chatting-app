/**
 * Environment configuration (dev / prod).
 * Use app.config.js or EAS env vars to inject APP_ENV and Firebase keys at build time.
 */

export type AppEnv = 'development' | 'staging' | 'production';

export const APP_ENV: AppEnv =
  (process.env.EXPO_PUBLIC_APP_ENV as AppEnv) ?? 'development';

export const IS_DEV = APP_ENV === 'development';
export const IS_PROD = APP_ENV === 'production';

/** Firebase Web config — replace via EAS Secrets or .env */
export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

/** Agora App ID — use Voice SDK abstraction; inject via env */
export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';

/** Razorpay key ID (public). Keep secret in backend. */
export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

/** Google OAuth Web Client ID — for expo-auth-session Google Sign-In */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export default {
  APP_ENV,
  IS_DEV,
  IS_PROD,
  FIREBASE_CONFIG,
  AGORA_APP_ID,
  RAZORPAY_KEY_ID,
  GOOGLE_WEB_CLIENT_ID,
};
