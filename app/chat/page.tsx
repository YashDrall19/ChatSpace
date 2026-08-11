'use client';

import { useAuth } from '@/contexts/auth-context';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatView } from '@/components/chat/chat-view';

export default function ChatPage() {
  const { user } = useAuth();

  return (
    <>
      <ChatSidebar />
      <div className="flex-1 overflow-hidden">
        {user ? <ChatView userId={String(user.id)} /> : null}
      </div>
    </>
  );
}
