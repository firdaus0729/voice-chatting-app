/**
 * Google Sign-In via expo-auth-session.
 * Uses OpenID code flow; exchanges code for tokens and signs into Firebase.
 */

import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { signInWithGoogleIdToken } from '@/services/firebase/auth';
import { authService } from '../services/authService';
import { useAuthStore } from '@/store/auth';
import { GOOGLE_WEB_CLIENT_ID } from '@/config/env';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function useGoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setLoading: setStoreLoading, setError: setStoreError } = useAuthStore();

  const signIn = useCallback(async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      const msg = 'Google Web Client ID not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.';
      setError(msg);
      setStoreError(msg);
      return;
    }
    setLoading(true);
    setError(null);
    setStoreLoading();
    try {
      const isExpoGo = Constants.appOwnership === 'expo';
      /**
       * Expo Go requires the AuthSession proxy redirect URL.
       * Production builds should use the custom scheme redirect.
       */
      const redirectUri = isExpoGo
        ? AuthSession.makeRedirectUri(({ useProxy: true } as any))
        : AuthSession.makeRedirectUri({
            scheme: 'voicechatapp',
            path: 'redirect',
          });
      const request = await AuthSession.loadAsync(
        {
          clientId: GOOGLE_WEB_CLIENT_ID,
          redirectUri,
          scopes: ['openid', 'profile', 'email'],
          responseType: AuthSession.ResponseType.Code,
          usePKCE: true,
        },
        discovery
      );
      const result = await request.promptAsync(
        discovery,
        (isExpoGo ? ({ useProxy: true } as any) : undefined) as any
      );
      if (result.type !== 'success') {
        if (result.type === 'cancel') {
          setError(null);
          useAuthStore.getState().setStatus('unauthenticated');
        } else {
          setError('Sign-in was cancelled or failed.');
        }
        return;
      }
      const { code } = result.params;
      if (!code) {
        setError('No authorization code received.');
        return;
      }
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: GOOGLE_WEB_CLIENT_ID,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier ?? '',
          },
        },
        { tokenEndpoint: discovery.tokenEndpoint }
      );
      const idToken =
        tokenResult.idToken ??
        (tokenResult as { params?: { id_token?: string } }).params?.id_token;
      if (!idToken) {
        const msg =
          'Google did not return an ID token. For production, use @react-native-google-signin/google-signin.';
        setError(msg);
        setStoreError(msg);
        return;
      }
      const { user } = await signInWithGoogleIdToken(idToken);
      await authService.loadUserIntoStore(user);
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Google Sign-In failed';
      const msg =
        typeof raw === 'string' && raw.includes('redirect_uri_mismatch')
          ? `${raw}\n\nFix: add this Redirect URI to your Google OAuth Web Client:\n${AuthSession.makeRedirectUri(({ useProxy: true } as any))}`
          : raw;
      setError(msg);
      setStoreError(msg);
      useAuthStore.getState().setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [setStoreLoading, setStoreError]);

  return { signIn, loading, error };
}

export { useGoogleSignIn };
