import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../../store/workspace';
import { useAnnotationStore } from '../../store/annotations';
import { useAnnotations } from '../../api/annotations';
import StickyNote from '../annotations/StickyNote';
import StickyNoteEditor from '../annotations/StickyNoteEditor';
import ChatPanel from '../chat/ChatPanel';

type Tab = 'notes' | 'chat';

export default function NotesPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const activeDocumentId = useWorkspaceStore((s) => s.activeDocumentId);
  const activeAnnotationId = useWorkspaceStore((s) => s.activeAnnotationId);
  const pendingSelection = useWorkspaceStore((s) => s.pendingSelection);
  const editingAnnotationId = useAnnotationStore((s) => s.editingAnnotationId);
  const { data: annotations } = useAnnotations(activeDocumentId);

  useEffect(() => {
    if (activeAnnotationId || pendingSelection) {
      setActiveTab('notes');
    }
  }, [activeAnnotationId, pendingSelection]);

  const editingAnnotation = annotations?.find((a) => a.id === editingAnnotationId);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex border-b border-[#E3E2DF]">
        {(['notes', 'chat'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors duration-100 ${
              activeTab === tab
                ? 'bg-[#EFEEEC] text-[#1A1A1A]'
                : 'text-[#A0A09A] hover:text-[#6B6B6B]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'notes' ? (
        <div className="flex-1 overflow-y-auto p-4">
          {!activeDocumentId && (
            <p className="text-sm text-[#6B6B6B]">Select a document to see annotations.</p>
          )}

          {activeDocumentId && pendingSelection && (
            <StickyNoteEditor
              mode="create"
              selection={pendingSelection}
              documentId={activeDocumentId}
            />
          )}

          {activeDocumentId && editingAnnotation && (
            <StickyNoteEditor
              mode="edit"
              annotation={editingAnnotation}
              documentId={activeDocumentId}
            />
          )}

          {annotations?.map((ann) =>
            ann.id === editingAnnotationId ? null : (
              <StickyNote
                key={ann.id}
                annotation={ann}
                isActive={ann.id === activeAnnotationId}
              />
            )
          )}

          {activeDocumentId && annotations?.length === 0 && !pendingSelection && (
            <p className="text-sm text-[#A0A09A]">
              Select text on the PDF to create a highlight.
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <ChatPanel />
        </div>
      )}
    </div>
  );
}
