// Minimal Firebase initialization for Auth + Firestore.
// All values from root .env (EXPO_PUBLIC_FIREBASE_*). See .env.example.

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0]!;
    }
  }
  return app!;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth!;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db!;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) {
    functions = getFunctions(getFirebaseApp());
    // Uncomment to test against emulator: connectFunctionsEmulator(functions, 'localhost', 5001);
  }
  return functions!;
}

