'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { UserSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

export function useSettings() {
  const { user, settings: contextSettings, setSettings: setAuthSettings } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    if (contextSettings) {
      setSettings(contextSettings);
      setLoading(false);
    }
  }, [user, contextSettings]);

  const update = useCallback(async (updates: Partial<UserSettings>) => {
    if (!user) return;

    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setAuthSettings(newSettings);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        throw new Error('Failed to update settings');
      }
    } catch (err) {
      console.error('Error updating settings:', err);
      if (contextSettings) {
        setSettings(contextSettings);
        setAuthSettings(contextSettings);
      }
    }
  }, [user, settings, contextSettings, setAuthSettings]);

  return { settings, update, loading };
}
