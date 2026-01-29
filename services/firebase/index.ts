/**
 * Firebase service abstraction — init, auth, firestore.
 * Centralized config from env; use FIREBASE_CONFIG for web client.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIG } from '@/config/env';
import { Platform } from 'react-native';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const hasValidConfig = !!(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.authDomain
);

function initFirebase(): FirebaseApp | null {
  if (getApps().length > 0) {
    app = getApps()[0] as FirebaseApp;
    return app;
  }
  if (!hasValidConfig) {
    if (__DEV__) {
      console.warn('[Firebase] Missing config. Set EXPO_PUBLIC_FIREBASE_* env vars.');
    }
    return null;
  }
  app = initializeApp(FIREBASE_CONFIG);
  return app;
}

function initAuth(): Auth | null {
  if (auth) return auth;
  const baseApp = app ?? initFirebase();
  if (!baseApp) return null;

  if (Platform.OS === 'web') {
    auth = getAuth(baseApp);
    return auth;
  }

  try {
    auth = initializeAuth(baseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === 'auth/already-initialized') {
      auth = getAuth(baseApp);
    } else {
      throw e;
    }
  }
  return auth;
}

function initFirestore(): Firestore | null {
  if (db) return db;
  const baseApp = app ?? initFirebase();
  if (!baseApp) return null;
  db = getFirestore(baseApp);
  return db;
}

export function getFirebaseApp(): FirebaseApp | null {
  return app ?? initFirebase();
}

export function getFirebaseAuth(): Auth | null {
  return initAuth();
}

export function getFirebaseDb(): Firestore | null {
  return initFirestore();
}

export function isFirebaseConfigured(): boolean {
  return hasValidConfig;
}

export { app, auth, db };
