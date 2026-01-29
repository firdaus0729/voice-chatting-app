/**
 * useAuth — auth state and actions from store.
 */

import { useAuthStore } from '@/store/auth';
import { authService } from '../services/authService';

export function useAuth() {
  const { user, profile, status, error, initialized, setLoading, setError } = useAuthStore();

  return {
    user,
    profile,
    status,
    error,
    initialized,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    signOut: () => authService.signOut(),
    setLoading,
    setError,
  };
}
