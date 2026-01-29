/**
 * Unified authentication service with explicit loginType.
 * All login flows must explicitly pass loginType - never auto-detect.
 */

import type { User as FirebaseUser } from 'firebase/auth';
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signInWithGoogleIdToken,
  getFirebaseAuth,
} from '@/services/firebase/auth';
import { requestPhoneOtp, verifyPhoneOtp } from '@/services/firebase/phone';
import {
  getUserDoc,
  createUserProfile,
  mapUserDocToAppUser,
  updateUserLastLogin,
} from '@/services/firebase/firestore';
import { useAuthStore } from '@/store/auth';
import type { AppUser, LoginType } from '@/types/user';
import { authService } from './authService';

export interface LoginPayload {
  phone?: string;
  email?: string;
  password?: string;
  googleIdToken?: string;
  phoneOtpCode?: string;
  displayName?: string;
}

export interface LoginResult {
  user: AppUser;
  isNewUser: boolean;
}

/**
 * Unified login function - loginType must be explicitly passed.
 * Never auto-detect login type.
 */
export async function login(
  loginType: LoginType,
  payload: LoginPayload
): Promise<LoginResult> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth not initialized');

  let fbUser: FirebaseUser;
  let isNewUser = false;

  switch (loginType) {
    case 'phone': {
      if (!payload.phone) throw new Error('Phone number required for phone login');
      if (!payload.phoneOtpCode) {
        // Request OTP (web only for now - RN needs backend)
        const otpResult = await requestPhoneOtp(payload.phone, 'recaptcha-container');
        if ('error' in otpResult) throw new Error(otpResult.error);
        throw new Error('OTP_SENT'); // Special error to indicate OTP was sent
      }
      // Verify OTP and sign in
      const result = await verifyPhoneOtp(payload.phoneOtpCode);
      if ('error' in result) throw new Error(result.error);
      fbUser = auth.currentUser!;
      if (!fbUser) throw new Error('Phone verification succeeded but no user found');
      break;
    }

    case 'google': {
      if (!payload.googleIdToken) throw new Error('Google ID token required');
      const result = await signInWithGoogleIdToken(payload.googleIdToken);
      fbUser = result.user;
      break;
    }

    case 'email': {
      if (!payload.email || !payload.password) {
        throw new Error('Email and password required');
      }
      try {
        const result = await signInWithEmailPassword(payload.email, payload.password);
        fbUser = result.user;
      } catch (e: unknown) {
        const err = e as { code?: string };
        // If user doesn't exist, try sign up
        if (err.code === 'auth/user-not-found' && payload.displayName) {
          const signUpResult = await signUpWithEmailPassword(
            payload.email,
            payload.password,
            payload.displayName
          );
          fbUser = signUpResult.user;
          isNewUser = true;
        } else {
          throw e;
        }
      }
      break;
    }

    case 'apple': {
      // TODO: Implement Apple Sign-In when needed
      throw new Error('Apple Sign-In not yet implemented');
    }

    case 'guest': {
      // TODO: Implement guest mode when needed
      throw new Error('Guest mode not yet implemented');
    }

    default:
      throw new Error(`Unsupported login type: ${loginType}`);
  }

  // Check if user exists in Firestore
  const existingDoc = await getUserDoc(fbUser.uid);
  if (!existingDoc) {
    isNewUser = true;
    // Create Firestore profile
    await createUserProfile({
      uid: fbUser.uid,
      loginType,
      phone: fbUser.phoneNumber ?? payload.phone ?? null,
      email: fbUser.email ?? payload.email ?? null,
      displayName:
        payload.displayName ??
        fbUser.displayName ??
        fbUser.email ??
        fbUser.phoneNumber ??
        `User ${fbUser.uid.slice(0, 8)}`,
      photoURL: fbUser.photoURL ?? null,
      authProvider: loginType === 'google' ? 'google' : 'phone',
    });
  } else {
    // Update lastLoginAt
    await updateUserLastLogin(fbUser.uid);
  }

  // Load user into store (pass loginType to ensure correct profile creation)
  await authService.createProfileIfNeeded(fbUser, loginType);
  await authService.loadUserIntoStore(fbUser);

  const userDoc = await getUserDoc(fbUser.uid);
  if (!userDoc) throw new Error('Failed to load user profile');

  return {
    user: mapUserDocToAppUser(userDoc),
    isNewUser,
  };
}
