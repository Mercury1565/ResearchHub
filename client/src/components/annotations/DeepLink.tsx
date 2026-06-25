import { ReactNode } from 'react';

const DEEP_LINK_REGEX = /researchhub:\/\/project\/[^/]+\/doc\/[^?]+\?page=\d+&highlight=[a-f0-9-]+/g;

export function renderWithDeepLinks(
  text: string,
  onNavigate: (uri: string) => void
): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(DEEP_LINK_REGEX)) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const uri = match[0];
    parts.push(
      <span
        key={match.index}
        className="text-[#2383E2] underline cursor-pointer hover:text-[#1b6ec2]"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(uri);
        }}
      >
        📎 Ref
      </span>
    );
    lastIndex = match.index + uri.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}
