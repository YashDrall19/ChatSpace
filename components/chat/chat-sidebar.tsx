'use client';

import { useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Images, FolderOpen, Settings, LogOut, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/chat', label: 'Messages', icon: MessageSquare },
  { href: '/chat/media', label: 'Media', icon: Images },
  { href: '/chat/files', label: 'Files', icon: FolderOpen },
  { href: '/chat/settings', label: 'Settings', icon: Settings },
];

export function ChatSidebar() {
  const { user, profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useLayoutEffect(() => {
    const stored = window.localStorage.getItem('chat-sidebar-collapsed');
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
    setSidebarReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('chat-sidebar-collapsed', String(next));
      return next;
    });
  }

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
    <aside className={cn('flex flex-col border-r bg-card', collapsed ? 'w-16' : 'w-16 lg:w-64', sidebarReady ? 'transition-all duration-200' : 'transition-none')}>
      {/* Logo */}
      <div className={cn('relative flex h-16 items-center border-b px-2 lg:px-6', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">Vault</span>
          </div>
        )}
        {/* <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', collapsed ? 'absolute left-2 top-1/2 -translate-y-1/2' : '')}
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button> */}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2 lg:p-4">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href === '/chat' && pathname === '/chat');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                collapsed && 'justify-center'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn('hidden', !collapsed && 'lg:block')}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t p-2 lg:p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.photoURL || user?.photoURL || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={cn('hidden min-w-0 flex-1 lg:block', collapsed && 'hidden')}>
            <p className="truncate text-sm font-medium">
              {profile?.displayName || 'User'}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
