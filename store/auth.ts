/**
 * Auth state — Zustand store.
 * Synced with Firebase onAuthStateChanged; drives auth gate and UI.
 */

import { create } from 'zustand';
import type { AppUser, UserProfile } from '@/types/user';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
  /** Full app user (profile + economy + VIP + agency + inventory). Null when not loaded or signed out. */
  user: AppUser | null;
  /** Minimal profile for auth gate (uid, displayName, etc.). */
  profile: UserProfile | null;
  status: AuthStatus;
  error: string | null;
  /** True once we've received first auth state from Firebase. */
  initialized: boolean;
}

interface AuthActions {
  setUser: (user: AppUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setStatus: (status: AuthStatus) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  /** Clear user/profile, set unauthenticated. */
  signOut: () => void;
  /** Reset to loading (e.g. during sign-in). */
  setLoading: () => void;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  status: 'idle',
  error: null,
  initialized: false,
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,
  setUser: (user: AppUser | null) => set({ user }),
  setProfile: (profile: UserProfile | null) => set({ profile }),
  setStatus: (status: AuthStatus) => set({ status }),
  setError: (error: string | null) => set({ error }),
  setInitialized: (initialized: boolean) => set({ initialized }),
  signOut: () =>
    set({
      user: null,
      profile: null,
      status: 'unauthenticated',
      error: null,
    }),
  setLoading: () => set({ status: 'loading', error: null }),
}));
