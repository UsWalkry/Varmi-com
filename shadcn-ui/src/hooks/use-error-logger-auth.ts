import { useEffect } from 'react';
import { useAuth } from './use-auth-mysql';
import { setUserContext, clearUserContext } from '../lib/errorLogger';

/**
 * Hook to integrate error logging with MySQL authentication state
 * Automatically sets/clears user context when auth state changes
 */
export function useErrorLoggerAuth() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setUserContext(user.id, user.email);
    } else {
      clearUserContext();
    }
  }, [user]);
}