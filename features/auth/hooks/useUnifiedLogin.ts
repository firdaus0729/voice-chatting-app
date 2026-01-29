/**
 * Hook for unified login with explicit loginType.
 * All login flows must explicitly pass loginType.
 */

import { useState, useCallback } from 'react';
import { login, type LoginPayload, type LoginResult } from '../services/unifiedAuthService';
import type { LoginType } from '@/types/user';
import { useAuthStore } from '@/store/auth';

export function useUnifiedLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setLoading: setStoreLoading, setError: setStoreError } = useAuthStore();

  const handleLogin = useCallback(
    async (loginType: LoginType, payload: LoginPayload): Promise<LoginResult | null> => {
      setLoading(true);
      setError(null);
      setStoreLoading();

      try {
        const result = await login(loginType, payload);
        setStoreError(null);
        return result;
      } catch (e: unknown) {
        const err = e as { message?: string };
        const msg = err?.message ?? 'Login failed';
        
        // Special handling for OTP flow
        if (msg === 'OTP_SENT') {
          setError(null); // Don't show error for OTP sent
          return null; // Indicates OTP was sent, need to verify
        }

        setError(msg);
        setStoreError(msg);
        useAuthStore.getState().setStatus('error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setStoreLoading, setStoreError]
  );

  return {
    login: handleLogin,
    loading,
    error,
  };
}
