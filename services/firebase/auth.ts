/**
 * Firebase Auth abstraction.
 * Phone OTP, Google Sign-In, sign out, auth state.
 */

import {
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  GoogleAuthProvider,
  type User as FirebaseUser,
  type Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from './index';
import type { AuthProvider } from '@/types/user';

export type AuthStateListener = (user: FirebaseUser | null) => void;

/** Get ID token for Google Sign-In credential. Caller obtains idToken via expo-auth-session. */
export function signInWithGoogleIdToken(idToken: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth not initialized');
  const cred = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, cred);
}

/** Sign in with email and password. */
export async function signInWithEmailPassword(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth not initialized');
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/** Create a new user account with email and password. */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
  displayName?: string
) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth not initialized');
  const result = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  // Persist displayName in Firebase Auth so downstream (Firestore profile creation)
  // can reliably read it from `fbUser.displayName`.
  if (displayName?.trim()) {
    await updateProfile(result.user, { displayName: displayName.trim() });
  }
  return result;
}

export function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return Promise.resolve();
  return fbSignOut(auth);
}

export function onAuthStateChanged(listener: AuthStateListener): Unsubscribe {
  const auth = getFirebaseAuth();
  if (!auth) return () => {};
  return fbOnAuthStateChanged(auth, listener);
}

/** Map Firebase user to auth provider. */
export function getAuthProvider(fbUser: FirebaseUser): AuthProvider {
  const provider = fbUser.providerData[0]?.providerId ?? '';
  if (provider.includes('google')) return 'google';
  if (provider.includes('password') || provider.includes('email')) return 'phone'; // Treat email as phone for now
  return 'phone';
}

export { getFirebaseAuth };
