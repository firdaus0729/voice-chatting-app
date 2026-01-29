/**
 * Phone OTP auth — Firebase Phone Auth abstraction.
 *
 * On React Native, signInWithPhoneNumber requires RecaptchaVerifier (web).
 * Production options:
 * 1) WebView-hosted reCAPTCHA + Firebase Phone
 * 2) Backend: verify OTP (e.g. Twilio/Firebase Admin) → createCustomToken → signInWithCustomToken
 *
 * This module exposes requestOtp / verifyOtp. Implementations can plug in
 * either Firebase Phone or a custom-token backend.
 */

import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  type Auth,
} from 'firebase/auth';
import { getFirebaseAuth } from './index';

let recaptchaVerifier: RecaptchaVerifier | null = null;
let lastConfirmationResult: ConfirmationResult | null = null;

/**
 * Get or create RecaptchaVerifier. Only valid in web / WebView context.
 * containerOrId: HTML element id (web) or container element.
 */
export function getRecaptchaVerifier(containerOrId: string | { current: HTMLElement | null }): RecaptchaVerifier | null {
  const auth = getFirebaseAuth();
  if (!auth || typeof containerOrId !== 'string') return null;
  if (recaptchaVerifier) return recaptchaVerifier;
  try {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerOrId, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {},
    });
    return recaptchaVerifier;
  } catch {
    return null;
  }
}

/**
 * Request OTP. Uses Firebase Phone Auth when RecaptchaVerifier is available (web).
 * On RN, use a backend flow and signInWithCustomToken instead.
 */
export async function requestPhoneOtp(
  phoneNumber: string,
  containerOrId?: string | { current: HTMLElement | null }
): Promise<{ verificationId: string } | { error: string }> {
  const auth = getFirebaseAuth();
  if (!auth) return { error: 'Auth not initialized' };

  if (typeof containerOrId === 'string' && containerOrId) {
    const verifier = getRecaptchaVerifier(containerOrId);
    if (!verifier) return { error: 'Recaptcha not available' };
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      lastConfirmationResult = result;
      return { verificationId: result.verificationId };
    } catch (e: unknown) {
      const err = e as { message?: string };
      return { error: err?.message ?? 'Failed to send OTP' };
    }
  }

  return { error: 'Phone OTP requires RecaptchaVerifier (web) or custom-token backend (RN).' };
}

/**
 * Verify OTP and sign in. Call after requestPhoneOtp when using Firebase Phone.
 */
export async function verifyPhoneOtp(code: string): Promise<{ success: true } | { error: string }> {
  if (!lastConfirmationResult) return { error: 'No verification in progress' };
  try {
    await lastConfirmationResult.confirm(code);
    lastConfirmationResult = null;
    return { success: true };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { error: err?.message ?? 'Invalid code' };
  }
}

/**
 * For RN backend flow: sign in with custom token from your API.
 */
export async function signInWithCustomToken(token: string) {
  const { signInWithCustomToken: fbSignInWithCustomToken } = await import('firebase/auth');
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Auth not initialized');
  return fbSignInWithCustomToken(auth, token);
}

export { getFirebaseAuth };
export type { Auth };
