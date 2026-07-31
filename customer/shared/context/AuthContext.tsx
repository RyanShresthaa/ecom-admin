'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  fetchUserProfile,
  loginWithGoogleCredential,
  loginWithPassword,
  logoutUser,
  registerUser,
  verifyTwoFactorLogin,
  type ApiUserProfile,
} from '@/lib/api';

export interface User {
  name: string;
  email: string;
  avatar?: string;
  id?: string | number;
  /** Account created_at from API */
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoaded: boolean;
  login: (email: string, password: string) => Promise<{ requires2fa: true; tempToken: string } | void>;
  completeTwoFactorLogin: (tempToken: string, code: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{
    requiresEmailVerification: boolean;
  }>;
  googleLogin: (
    credential: string,
  ) => Promise<{ requires2fa: true; tempToken: string } | void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LEGACY_AUTH_KEYS = ['apah_user', 'apah_registered_user'];

function clearLegacyAuthStorage() {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_AUTH_KEYS) {
    localStorage.removeItem(key);
  }
}

function toUser(profile: ApiUserProfile | null | undefined): User | null {
  if (!profile?.email && !profile?.name) return null;
  const avatarRaw = profile.avatar != null ? String(profile.avatar).trim() : '';
  const createdAt = profile.createdAt || profile.created_at || undefined;
  return {
    id: profile.id ?? profile._id,
    name: String(profile.name || profile.email || 'User'),
    email: String(profile.email || ''),
    avatar: avatarRaw || undefined,
    createdAt: createdAt ? String(createdAt) : undefined,
  };
}

function toAuthError(err: unknown, fallback: string): Error {
  if (err instanceof ApiError) return new Error(err.message || fallback);
  if (err instanceof Error) return err;
  return new Error(fallback);
}

async function loadSessionUser(): Promise<User | null> {
  clearLegacyAuthStorage();
  try {
    const profile = await fetchUserProfile();
    return toUser(profile);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const next = await loadSessionUser();
      setUser(next);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await loadSessionUser();
        if (!cancelled) setUser(next);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // Only hit /logout when we think a session exists; avoids noisy 401s when already logged out.
      if (user) await logoutUser();
      clearLegacyAuthStorage();
      setUser(null);
      const result = await loginWithPassword(email, password);
      if (result.requires2fa) {
        return { requires2fa: true as const, tempToken: result.tempToken };
      }
      const next = await loadSessionUser();
      setUser(next);
      if (!next) throw new Error('Signed in, but could not load your profile');
    } catch (err) {
      setUser(null);
      throw toAuthError(err, 'Sign in failed');
    }
  }, [user]);

  const completeTwoFactorLogin = useCallback(async (tempToken: string, code: string) => {
    try {
      await verifyTwoFactorLogin({ tempToken, code });
      const next = await loadSessionUser();
      setUser(next);
      if (!next) throw new Error('Signed in, but could not load your profile');
    } catch (err) {
      setUser(null);
      throw toAuthError(err, 'Invalid authenticator code');
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      clearLegacyAuthStorage();
      const result = await registerUser({ name, email, password });
      return {
        requiresEmailVerification: Boolean(result?.requiresEmailVerification),
      };
    } catch (err) {
      throw toAuthError(err, 'Could not create account');
    }
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    try {
      if (user) await logoutUser();
      clearLegacyAuthStorage();
      setUser(null);
      const result = await loginWithGoogleCredential(credential);
      if (result.requires2fa) {
        return { requires2fa: true as const, tempToken: result.tempToken };
      }
      const next = await loadSessionUser();
      setUser(next);
      if (!next) throw new Error('Google sign-in succeeded, but could not load your profile');
    } catch (err) {
      setUser(null);
      throw toAuthError(err, 'Google sign-in failed');
    }
  }, [user]);

  const logout = useCallback(async () => {
    await logoutUser();
    clearLegacyAuthStorage();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      isLoaded,
      login,
      completeTwoFactorLogin,
      signup,
      googleLogin,
      logout,
      refreshUser,
    }),
    [user, isLoaded, login, completeTwoFactorLogin, signup, googleLogin, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
