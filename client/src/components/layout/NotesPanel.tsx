// Placeholder — will hold StickyNote list + ChatPanel
export default function NotesPanel() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-200 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Notes & Chat</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-gray-400">Highlights and AI chat will appear here.</p>
      </div>
    </div>
  );
}
