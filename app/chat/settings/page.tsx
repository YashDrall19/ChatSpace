'use client';

import { useAuth } from '@/contexts/auth-context';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, User, Bell, Palette, MessageSquare } from 'lucide-react';

import { toast } from 'sonner';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { settings, update, loading } = useSettings();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');

  if (!user) return null;

  async function handleSaveName() {
    if (!user) return;
    try {
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ displayName }),
      });
      await refreshProfile();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  }

  return (
    <>
      <ChatSidebar />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your preferences</p>
          </div>
        </header>

        <div className="mx-auto max-w-2xl space-y-4 p-4 lg:p-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Profile</CardTitle>
                  <CardDescription>Update your display name</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                  />
                  <Button onClick={handleSaveName}>Save</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email || ''} disabled className="bg-muted/50" />
              </div>
            </CardContent>
          </Card>

          {/* Chat Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Chat Preferences</CardTitle>
                  <CardDescription>Customize your messaging experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading settings...</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="send-on-enter">Send on Enter</Label>
                    <Switch
                      id="send-on-enter"
                      checked={settings.sendOnEnter}
                      onCheckedChange={(v) => update({ sendOnEnter: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-timestamps">Show Timestamps</Label>
                    <Switch
                      id="show-timestamps"
                      checked={settings.showTimestamps}
                      onCheckedChange={(v) => update({ showTimestamps: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compact-view">Compact View</Label>
                    <Switch
                      id="compact-view"
                      checked={settings.compactView}
                      onCheckedChange={(v) => update({ compactView: v })}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Notifications</CardTitle>
                  <CardDescription>Manage notification preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Enable Notifications</Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(v) => update({ notifications: v })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Appearance</CardTitle>
                  <CardDescription>Customize how Vault looks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="theme">Theme</Label>
                <select
                  id="theme"
                  value={settings.theme}
                  onChange={(e) => update({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                  className="rounded-md border bg-background px-3 py-1.5 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
