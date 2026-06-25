import { useProjects } from '../../api/projects';
import { useWorkspaceStore } from '../../store/workspace';

export default function Sidebar() {
  const { data: projects, isLoading } = useProjects();
  const { activeProjectId, setActiveProject } = useWorkspaceStore();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-gray-900">ResearchHub</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-gray-500">
          Projects
        </p>

        {isLoading && (
          <p className="px-2 text-xs text-gray-400">Loading…</p>
        )}

        {projects?.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveProject(p.id)}
            className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
              activeProjectId === p.id
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {p.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
