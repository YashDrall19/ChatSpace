'use client';

import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, User, Bell, Palette, MessageSquare, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
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

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <>
      <ChatSidebar />
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-card/80 px-4 backdrop-blur-xl lg:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-primary/20">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your preferences</p>
          </div>
        </header>

        <div className="mx-auto max-w-2xl space-y-4 p-4 lg:p-6">
          {/* Profile */}
          <Card className="border-border/60 shadow-sm animate-slide-up">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-500/15">
                  <User className="h-5 w-5 text-primary" />
                </div>
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
                    className="rounded-xl"
                  />
                  <Button onClick={handleSaveName} className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600">Save</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email || ''} disabled className="bg-muted/50 rounded-xl" />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="border-border/60 shadow-sm animate-slide-up" style={{ animationDelay: '50ms' }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-500/15">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Appearance</CardTitle>
                  <CardDescription>Customize how Vault looks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setTheme(opt.value);
                        update({ theme: opt.value });
                      }}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all duration-200 hover:scale-105',
                        theme === opt.value
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border/60 hover:border-primary/30'
                      )}
                    >
                      <opt.icon className={cn('h-6 w-6', theme === opt.value ? 'text-primary' : 'text-muted-foreground')} />
                      <span className={cn('text-sm font-medium', theme === opt.value ? 'text-primary' : 'text-muted-foreground')}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Preferences */}
          <Card className="border-border/60 shadow-sm animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-500/15">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
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
                  <div className="flex items-center justify-between rounded-xl hover:bg-muted/30 px-3 py-2 transition-colors">
                    <Label htmlFor="send-on-enter">Send on Enter</Label>
                    <Switch
                      id="send-on-enter"
                      checked={settings.sendOnEnter}
                      onCheckedChange={(v) => update({ sendOnEnter: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl hover:bg-muted/30 px-3 py-2 transition-colors">
                    <Label htmlFor="show-timestamps">Show Timestamps</Label>
                    <Switch
                      id="show-timestamps"
                      checked={settings.showTimestamps}
                      onCheckedChange={(v) => update({ showTimestamps: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl hover:bg-muted/30 px-3 py-2 transition-colors">
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
          <Card className="border-border/60 shadow-sm animate-slide-up" style={{ animationDelay: '150ms' }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-500/15">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Notifications</CardTitle>
                  <CardDescription>Manage notification preferences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-xl hover:bg-muted/30 px-3 py-2 transition-colors">
                <Label htmlFor="notifications">Enable Notifications</Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(v) => update({ notifications: v })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
