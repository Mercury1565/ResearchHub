import { useState, useRef, useEffect } from 'react';
import { useStreamChat } from '../../hooks/useStreamChat';
import { useWorkspaceStore } from '../../store/workspace';
import ChatMessage from './ChatMessage';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

export default function ChatPanel() {
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId);
  const { messages, isStreaming, sendMessage } = useStreamChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !activeProjectId || isStreaming) return;
    sendMessage(activeProjectId, input.trim());
    setInput('');
  };

  if (!activeProjectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[#6B6B6B]">Select a project to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-[#A0A09A]">Ask a question about your documents…</p>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-[#A0A09A]">
            <Spinner /> Thinking…
          </div>
        )}
      </div>

      <div className="border-t border-[#E3E2DF] p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about your research…"
            className="flex-1 rounded border border-[#E3E2DF] bg-white px-3 py-1.5 text-sm text-[#1A1A1A] outline-none focus:border-[#2383E2]"
            disabled={isStreaming}
          />
          <Button variant="primary" onClick={handleSend} disabled={isStreaming || !input.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
