import type { ChatMessage as ChatMessageType } from '../../types';
import CitationBadge from './CitationBadge';

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`mb-3 ${isUser ? 'text-right' : ''}`}>
      <div
        className={`inline-block max-w-[85%] rounded px-3 py-2 text-sm text-[#1A1A1A] ${
          isUser ? 'bg-[#EFEEEC]' : 'bg-white border border-[#E3E2DF]'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      {message.citations && message.citations.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {message.citations.map((c, i) => (
            <CitationBadge key={i} citation={c} />
          ))}
        </div>
      )}
    </div>
  );
}
