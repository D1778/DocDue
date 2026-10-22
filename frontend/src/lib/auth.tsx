'use client';

// The login state of the whole app.
// Any component can call useAuth() to learn who is logged in and to log in or out.

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api, setSessionExpiredHandler } from './api';
import { clearTokens, getTokens, saveTokens } from './storage';
import { useResource } from './useResource';
import type { MeResponse, RegisterInput, Tenant, User } from './types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'unreachable';

interface AuthValue {
  status: AuthStatus;
  user: User | null;
  tenant: Tenant | null;
  error: string | null;
  isAdmin: boolean;
  canManageTeam: boolean; // admins of organization accounts
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void; // after the profile picture changes
  retry: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

// Asks the backend "who am I?" if we hold tokens. null means "not logged in".
async function loadSession(): Promise<MeResponse | null> {
  if (!getTokens()) return null;
  try {
    return await api.me();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err; // the server could not be reached: do NOT log the user out for that
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useResource<MeResponse | null>('session', loadSession);
  const { mutate, reload } = session;

  // If a request discovers the session is over, switch to "logged out" everywhere.
  useEffect(() => {
    setSessionExpiredHandler(() => mutate(null));
    return () => setSessionExpiredHandler(null);
  }, [mutate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.login(email.trim().toLowerCase(), password);
      saveTokens(tokens);
      try {
        mutate(await api.me());
      } catch (err) {
        clearTokens();
        throw err;
      }
    },
    [mutate],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const tokens = await api.googleLogin(credential);
      saveTokens(tokens);
      try {
        mutate(await api.me());
      } catch (err) {
        clearTokens();
        throw err;
      }
    },
    [mutate],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await api.register(input);
      saveTokens(result.tokens);
      mutate({ user: result.user, tenant: result.tenant });
    },
    [mutate],
  );

  const logout = useCallback(() => {
    clearTokens();
    mutate(null);
    router.replace('/login');
  }, [mutate, router]);

  const current = session.data;
  const updateUser = useCallback(
    (user: User) => {
      if (current) mutate({ ...current, user });
    },
    [current, mutate],
  );

  const value = useMemo<AuthValue>(() => {
    const me = session.data;
    let status: AuthStatus = 'loading';
    if (me === null) status = 'anonymous';
    else if (me !== undefined) status = 'authenticated';
    else if (session.error) status = 'unreachable';

    const user = me?.user ?? null;
    const tenant = me?.tenant ?? null;
    const isAdmin = user?.role === 'admin';
    return {
      status,
      user,
      tenant,
      error: session.error,
      isAdmin,
      canManageTeam: isAdmin && tenant?.account_type === 'organization',
      login,
      loginWithGoogle,
      register,
      logout,
      updateUser,
      retry: reload,
    };
  }, [session.data, session.error, login, loginWithGoogle, register, logout, updateUser, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}