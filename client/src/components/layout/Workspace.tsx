import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import Sidebar from './Sidebar';
import ViewerPanel from './ViewerPanel';
import NotesPanel from './NotesPanel';

/**
 * Root workspace: 3-column split optimized for ≥1280px wide viewports.
 * Uses react-resizable-panels so users can drag panel boundaries.
 */
export default function Workspace() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      {/* Fixed-width sidebar */}
      <div className="w-64 shrink-0 border-r border-gray-200 bg-white">
        <Sidebar />
      </div>

      {/* Resizable viewer + notes panels */}
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={65} minSize={40}>
          <ViewerPanel />
        </Panel>

        <PanelResizeHandle className="w-1 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-colors" />

        <Panel defaultSize={35} minSize={25}>
          <NotesPanel />
        </Panel>
      </PanelGroup>
    </div>
  );
}
