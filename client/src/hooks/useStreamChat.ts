import { useState, useCallback } from 'react';
import type { ChatMessage, Citation } from '../types';

interface StreamChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (projectId: string, message: string) => Promise<void>;
  clearMessages: () => void;
}

export function useStreamChat(): StreamChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(async (projectId: string, message: string) => {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message };
    const assistantId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setIsStreaming(true);

    try {
      const token = localStorage.getItem('rh_token');
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: 'Failed to get a response.' } : m
          )
        );
        return;
      }

      const data = await response.json() as { message: string; citations?: Citation[] };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: data.message, citations: data.citations }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: 'Failed to get a response.' } : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
