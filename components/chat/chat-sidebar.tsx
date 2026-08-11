'use client';

import { useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Images,
  FolderOpen,
  Settings,
  LogOut,
  Shield,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/chat', label: 'Messages', icon: MessageSquare },
  { href: '/chat/media', label: 'Media', icon: Images },
  { href: '/chat/files', label: 'Files', icon: FolderOpen },
  { href: '/chat/settings', label: 'Settings', icon: Settings },
];

export function ChatSidebar() {
  const { user, profile, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [sidebarReady, setSidebarReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useLayoutEffect(() => {
    setSidebarReady(true);
  }, []);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  const initials = (profile?.displayName || user?.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside
      className={cn(
        'flex w-16 flex-col border-r border-border/60 bg-card/80 backdrop-blur-xl lg:w-64',
        sidebarReady ? 'transition-all duration-200' : 'transition-none'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-border/60 lg:justify-between lg:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-primary/20">
            <Shield className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-bold tracking-tight lg:block">Vault</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2 lg:p-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-md shadow-primary/25'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                  active && 'text-white'
                )}
              />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-2 lg:px-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-10 w-full rounded-xl text-muted-foreground hover:text-foreground lg:h-9 lg:w-9"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5 transition-transform duration-300 hover:rotate-180" />
          ) : (
            <Moon className="h-5 w-5 transition-transform duration-300 hover:-rotate-12" />
          )}
        </Button>
      </div>

      {/* User */}
      <div className="border-t border-border/60 p-2 lg:p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-border/50">
            <AvatarImage src={profile?.photoURL || user?.photoURL || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-sky-500/15 to-cyan-500/15 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-medium">
              {profile?.displayName || 'User'}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
