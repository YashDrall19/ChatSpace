'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { UserProfile, UserSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  setSettings: (next: UserSettings | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  settings: null,
  loading: true,
  refreshProfile: async () => {},
  refreshAuth: async () => {},
  signOut: async () => {},
  setSettings: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const updateSettingsState = useCallback((next: UserSettings | null) => {
    setSettings(next);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const [profileRes, settingsRes] = await Promise.all([
        fetch('/api/user', { credentials: 'same-origin' }),
        fetch('/api/user/settings', { credentials: 'same-origin' }),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }, [user]);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setProfile(data.profile);
        setSettings(data.settings);
      } else {
        setUser(null);
        setProfile(null);
        setSettings(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/me', { method: 'DELETE', credentials: 'same-origin' });
    } catch {
      // ignore failure, still clear local state
    }
    setUser(null);
    setProfile(null);
    setSettings(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setProfile(data.profile);
          setSettings(data.settings);
        }
      } catch {
        // Not authenticated
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    checkAuth();
    return () => { cancelled = true; };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, settings, loading, refreshProfile, refreshAuth, signOut, setSettings: updateSettingsState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { DEFAULT_SETTINGS };
