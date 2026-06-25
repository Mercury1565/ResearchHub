import { useEffect, useRef } from 'react';
import type { Annotation, FontStyle, FontSize } from '../../types';
import { useDeleteAnnotation } from '../../api/annotations';
import { useWorkspaceStore } from '../../store/workspace';
import { useAnnotationStore } from '../../store/annotations';
import { useDeepLink } from '../../hooks/useDeepLink';
import { renderWithDeepLinks } from './DeepLink';

const fontSizeClass: Record<FontSize, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};

const fontFamilyClass: Record<FontStyle, string> = {
  'sans-serif': 'font-sans',
  caveat: 'font-caveat',
  'indie-flower': 'font-indie',
  'patrick-hand': 'font-patrick',
};

interface Props {
  annotation: Annotation;
  isActive: boolean;
}

export default function StickyNote({ annotation, isActive }: Props) {
  const setActiveAnnotation = useWorkspaceStore((s) => s.setActiveAnnotation);
  const setActivePage = useWorkspaceStore((s) => s.setActivePage);
  const setEditingAnnotation = useAnnotationStore((s) => s.setEditingAnnotation);
  const deleteAnnotation = useDeleteAnnotation();
  const { navigateDeepLink } = useDeepLink();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(annotation.deep_link);
  };

  const handleClick = () => {
    setActiveAnnotation(annotation.id);
    setActivePage(annotation.page_number);
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`rounded border p-3 mb-2 cursor-pointer transition-colors duration-100 ${
        isActive
          ? 'border-[#2383E2] bg-[#FEFCE8] ring-2 ring-[#2383E2]/25 animate-[note-pulse_1s_ease-in-out]'
          : 'border-[#E3E2DF] bg-[#FEFCE8] hover:border-[#C8C7C4]'
      }`}
    >
      <p className="text-xs text-[#6B6B6B] mb-1 truncate">
        p.{annotation.page_number} — "{annotation.selection_txt}"
      </p>

      {annotation.note_content && (
        <div className={`mb-2 text-[#1A1A1A] ${fontSizeClass[annotation.font_size]} ${fontFamilyClass[annotation.font_style]}`}>
          {renderWithDeepLinks(annotation.note_content, navigateDeepLink)}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingAnnotation(annotation.id);
          }}
          className="text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors duration-100"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyLink();
          }}
          className="text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors duration-100"
        >
          Copy link
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteAnnotation.mutate({ id: annotation.id, documentId: annotation.document_id });
          }}
          className="text-xs text-[#E03E3E] hover:text-[#c03232] transition-colors duration-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
