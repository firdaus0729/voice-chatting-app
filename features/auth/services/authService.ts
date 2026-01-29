/**
 * Auth service — profile creation, store sync, sign-out.
 * Used by auth state listener and by sign-in flows (Google, Phone).
 */

import type { User as FirebaseUser } from 'firebase/auth';
import {
  getAuthProvider,
  signInWithGoogleIdToken,
  signOut as fbSignOut,
} from '@/services/firebase/auth';
import {
  getUserDoc,
  createUserProfile,
  mapUserDocToAppUser,
  updateUserLastLogin,
} from '@/services/firebase/firestore';
import { useAuthStore } from '@/store/auth';
import type { AppUser, AuthProvider, LoginType } from '@/types/user';

export const authService = {
  /**
   * Ensure Firestore user exists. Create default profile if new.
   * Returns AppUser.
   */
  async createProfileIfNeeded(
    fbUser: FirebaseUser,
    loginType?: LoginType
  ): Promise<AppUser> {
    const uid = fbUser.uid;
    const provider = getAuthProvider(fbUser);
    const existing = await getUserDoc(uid);
    if (existing) {
      // Update lastLoginAt even for existing users
      await updateUserLastLogin(uid);
      return mapUserDocToAppUser(existing);
    }

    // Determine loginType if not provided
    let determinedLoginType: LoginType = loginType ?? 'phone';
    if (!loginType) {
      if (provider === 'google') determinedLoginType = 'google';
      else if (fbUser.email && !fbUser.phoneNumber) determinedLoginType = 'email';
      else determinedLoginType = 'phone';
    }

    const phone = fbUser.phoneNumber ?? null;
    const email = fbUser.email ?? null;
    const displayName =
      fbUser.displayName ?? fbUser.email ?? fbUser.phoneNumber ?? `User ${uid.slice(0, 8)}`;
    const photoURL = fbUser.photoURL ?? null;

    await createUserProfile({
      uid,
      loginType: determinedLoginType,
      phone,
      email,
      displayName,
      photoURL,
      authProvider: provider,
    });
    const created = await getUserDoc(uid);
    if (!created) throw new Error('Failed to create user profile');
    return mapUserDocToAppUser(created);
  },

  /**
   * Load Firebase user into Zustand store. Call after sign-in or on auth state change.
   */
  async loadUserIntoStore(fbUser: FirebaseUser | null): Promise<void> {
    const { setUser, setProfile, setStatus, setError, setInitialized } = useAuthStore.getState();
    if (!fbUser) {
      setUser(null);
      setProfile(null);
      setStatus('unauthenticated');
      setError(null);
      setInitialized(true);
      return;
    }
    try {
      const appUser = await authService.createProfileIfNeeded(fbUser);
      setUser(appUser);
      setProfile(appUser);
      setStatus('authenticated');
      setError(null);
      setInitialized(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load user';
      setUser(null);
      setProfile(null);
      setStatus('error');
      setError(msg);
      setInitialized(true);
    }
  },

  /**
   * Sign out from Firebase and clear store.
   */
  async signOut(): Promise<void> {
    await fbSignOut();
    useAuthStore.getState().signOut();
  },
};
