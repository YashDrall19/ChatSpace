'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Images, FolderOpen, Settings, LogOut, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/chat', label: 'Messages', icon: MessageSquare },
  { href: '/chat/media', label: 'Media', icon: Images },
  { href: '/chat/files', label: 'Files', icon: FolderOpen },
  { href: '/chat/settings', label: 'Settings', icon: Settings },
];

export function ChatSidebar() {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/me', { method: 'DELETE', credentials: 'same-origin' });
    router.replace('/login');
  }

  const initials = (profile?.displayName || user?.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="flex w-16 flex-col border-r bg-card lg:w-64">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b lg:justify-start lg:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-bold lg:block">Vault</span>
        </div>
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
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
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
          <div className="hidden min-w-0 flex-1 lg:block">
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
