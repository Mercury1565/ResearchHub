import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspaceStore } from '../../store/workspace';
import Sidebar from './Sidebar';
import ViewerPanel from './ViewerPanel';
import NotesPanel from './NotesPanel';

function ChevronLeft() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8,2 4,6 8,10" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,2 8,6 4,10" />
    </svg>
  );
}

export default function Workspace() {
  const { projectId, documentId } = useParams<{ projectId?: string; documentId?: string }>();
  const setActiveProject  = useWorkspaceStore((s) => s.setActiveProject);
  const setActiveDocument = useWorkspaceStore((s) => s.setActiveDocument);

  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [notesPanelOpen, setNotesPanelOpen] = useState(true);
  const notesPanelRef = useRef<React.ElementRef<typeof Panel>>(null);

  useEffect(() => {
    if (projectId) setActiveProject(projectId);
  }, [projectId, setActiveProject]);

  useEffect(() => {
    if (documentId) setActiveDocument(documentId);
  }, [documentId, setActiveDocument]);

  const toggleNotesPanel = () => {
    if (notesPanelOpen) {
      notesPanelRef.current?.collapse();
    } else {
      notesPanelRef.current?.expand();
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F7F5]">

      {/* ── Left sidebar ─────────────────────────────────────────────── */}
      {sidebarOpen ? (
        <div className="w-64 shrink-0 border-r border-[#E3E2DF] bg-[#F7F7F5]">
          <Sidebar onCollapse={() => setSidebarOpen(false)} />
        </div>
      ) : (
        <div className="w-10 shrink-0 border-r border-[#E3E2DF] bg-[#F7F7F5] flex flex-col items-center pt-3">
          <button
            onClick={() => setSidebarOpen(true)}
            title="Expand sidebar"
            className="flex h-7 w-7 items-center justify-center rounded text-[#6B6B6B] hover:bg-[#EFEEEC] hover:text-[#1A1A1A] transition-colors duration-100"
          >
            <ChevronRight />
          </button>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={78} minSize={40}>
          <ViewerPanel />
        </Panel>

        {/* Resize handle with collapse toggle tab */}
        <PanelResizeHandle className="relative w-3 cursor-col-resize bg-[#E3E2DF] hover:bg-[#C8C7C4] transition-colors duration-100">
          <button
            onClick={toggleNotesPanel}
            onPointerDown={(e) => e.stopPropagation()}
            title={notesPanelOpen ? 'Collapse panel' : 'Expand panel'}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-5 items-center justify-center rounded-full border border-[#E3E2DF] bg-white text-[#6B6B6B] hover:bg-[#EFEEEC] hover:text-[#1A1A1A] transition-colors duration-100 z-10"
          >
            {notesPanelOpen ? <ChevronRight /> : <ChevronLeft />}
          </button>
        </PanelResizeHandle>

        <Panel
          ref={notesPanelRef}
          defaultSize={22}
          minSize={14}
          collapsible={true}
          collapsedSize={0}
          onCollapse={() => setNotesPanelOpen(false)}
          onExpand={() => setNotesPanelOpen(true)}
        >
          <NotesPanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}
