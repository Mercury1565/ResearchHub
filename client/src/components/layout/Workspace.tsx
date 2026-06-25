import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspaceStore } from '../../store/workspace';
import Sidebar from './Sidebar';
import ViewerPanel from './ViewerPanel';
import NotesPanel from './NotesPanel';

export default function Workspace() {
  const { projectId, documentId } = useParams<{ projectId?: string; documentId?: string }>();
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const setActiveDocument = useWorkspaceStore((s) => s.setActiveDocument);

  useEffect(() => {
    if (projectId) setActiveProject(projectId);
  }, [projectId, setActiveProject]);

  useEffect(() => {
    if (documentId) setActiveDocument(documentId);
  }, [documentId, setActiveDocument]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F7F5]">
      <div className="w-64 shrink-0 border-r border-[#E3E2DF] bg-[#F7F7F5]">
        <Sidebar />
      </div>

      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={65} minSize={40}>
          <ViewerPanel />
        </Panel>

        <PanelResizeHandle className="w-1 cursor-col-resize bg-[#E3E2DF] hover:bg-[#C8C7C4] transition-colors duration-100" />

        <Panel defaultSize={35} minSize={25}>
          <NotesPanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}
