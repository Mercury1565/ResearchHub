import { useState } from 'react';
import type { FontStyle, FontSize, PendingSelection, Annotation } from '../../types';
import { useCreateAnnotation, useUpdateAnnotation } from '../../api/annotations';
import { useWorkspaceStore } from '../../store/workspace';
import { useAnnotationStore } from '../../store/annotations';
import FontPicker from './FontPicker';
import Button from '../ui/Button';

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
  mode: 'create' | 'edit';
  annotation?: Annotation;
  selection?: PendingSelection;
  documentId: string;
}

export default function StickyNoteEditor({ mode, annotation, selection, documentId }: Props) {
  const [noteContent, setNoteContent] = useState(annotation?.note_content ?? '');
  const [fontStyle, setFontStyle] = useState<FontStyle>(annotation?.font_style ?? 'sans-serif');
  const [fontSize, setFontSize] = useState<FontSize>(annotation?.font_size ?? 'medium');

  const createAnnotation = useCreateAnnotation();
  const updateAnnotation = useUpdateAnnotation();
  const setPendingSelection = useWorkspaceStore((s) => s.setPendingSelection);
  const setEditingAnnotation = useAnnotationStore((s) => s.setEditingAnnotation);

  const handleSave = () => {
    if (mode === 'create' && selection) {
      createAnnotation.mutate(
        {
          documentId,
          page_number: selection.page_number,
          selection_txt: selection.selection_txt,
          coordinates: selection.coordinates,
          note_content: noteContent || null,
          font_style: fontStyle,
          font_size: fontSize,
        },
        { onSuccess: () => setPendingSelection(null) }
      );
    } else if (mode === 'edit' && annotation) {
      updateAnnotation.mutate(
        {
          id: annotation.id,
          note_content: noteContent || null,
          font_style: fontStyle,
          font_size: fontSize,
        },
        { onSuccess: () => setEditingAnnotation(null) }
      );
    }
  };

  const handleCancel = () => {
    if (mode === 'create') setPendingSelection(null);
    else setEditingAnnotation(null);
  };

  return (
    <div className="rounded border border-[#E3E2DF] bg-[#FEFCE8] p-3 mb-3">
      <p className="text-xs text-[#6B6B6B] mb-2 truncate">
        "{selection?.selection_txt ?? annotation?.selection_txt}"
      </p>
      <textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        placeholder="Add a note…"
        rows={3}
        className={`w-full resize-none rounded border border-[#E3E2DF] bg-white px-2 py-1.5 text-[#1A1A1A] outline-none focus:border-[#2383E2] ${fontSizeClass[fontSize]} ${fontFamilyClass[fontStyle]}`}
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FontPicker value={fontStyle} onChange={setFontStyle} />
          <div className="flex gap-0.5">
            {(['small', 'medium', 'large'] as FontSize[]).map((s) => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                className={`rounded px-1.5 py-0.5 text-xs transition-colors duration-100 ${
                  fontSize === s ? 'bg-[#EFEEEC] text-[#1A1A1A]' : 'text-[#6B6B6B] hover:bg-[#EFEEEC]'
                }`}
              >
                {s[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1">
          <Button onClick={handleCancel}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
