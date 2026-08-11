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
import { Settings as SettingsIcon, User, Bell, Palette, MessageSquare, Sun, Moon, Monitor, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings, update, loading } = useSettings();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const backgroundOptions = [
    { value: 'none', label: 'None', style: 'bg-slate-200 dark:bg-slate-700' },
    { value: 'teal', label: 'Teal', style: 'bg-gradient-to-br from-teal-200 to-cyan-200 dark:from-teal-900 dark:to-cyan-900' },
    { value: 'beige', label: 'Beige', style: 'bg-gradient-to-br from-stone-100 to-amber-100 dark:from-stone-800 dark:to-amber-900' },
    { value: 'sky', label: 'Sky', style: 'bg-gradient-to-br from-sky-200 to-cyan-200 dark:from-sky-900 dark:to-cyan-900' },
    { value: 'mint', label: 'Mint', style: 'bg-gradient-to-br from-emerald-200 to-teal-200 dark:from-emerald-900 dark:to-teal-900' },
    { value: 'peach', label: 'Peach', style: 'bg-gradient-to-br from-orange-200 to-rose-200 dark:from-orange-900 dark:to-rose-900' },
    { value: 'lavender', label: 'Lavender', style: 'bg-gradient-to-br from-violet-200 to-purple-200 dark:from-violet-900 dark:to-purple-900' },
    { value: 'cloud', label: 'Cloud', style: 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700' },
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    {backgroundOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => update({ chatBackground: option.value })}
                        className={cn(
                          'group relative overflow-hidden rounded-3xl border-2 p-3 text-left transition-all duration-200',
                          settings.chatBackground === option.value
                            ? 'border-primary shadow-lg'
                            : 'border-border/60 hover:border-primary/80'
                        )}
                      >
                        <div className={cn('h-20 rounded-3xl', option.style)} />
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{option.label}</span>
                          {settings.chatBackground === option.value && (
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] uppercase text-primary">Selected</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-border/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">Upload a background image</CardTitle>
                        <CardDescription>Choose an image to show behind your chat.</CardDescription>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingBackground}
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-600"
                      >
                        {uploadingBackground ? 'Uploading…' : 'Upload image'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => update({ chatBackground: 'none' })}
                        disabled={uploadingBackground}
                        className="rounded-xl"
                      >
                        Reset background
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        event.target.value = '';
                        setUploadingBackground(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                            credentials: 'same-origin',
                          });
                          if (!res.ok) throw new Error('Upload failed');
                          const data = await res.json();
                          update({ chatBackground: data.fileUrl });
                          toast.success('Background uploaded');
                        } catch (err) {
                          toast.error('Failed to upload background');
                        } finally {
                          setUploadingBackground(false);
                        }
                      }}
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
