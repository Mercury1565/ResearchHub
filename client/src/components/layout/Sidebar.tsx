import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useCreateProject, useRenameProject, useDeleteProject } from '../../api/projects';
import { useDocuments, useUploadDocument, useDeleteDocument } from '../../api/documents';
import { useWorkspaceStore } from '../../store/workspace';
import { useAuthStore } from '../../store/auth';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';

interface SidebarProps {
  onCollapse: () => void;
}

export default function Sidebar({ onCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { data: projects, isLoading } = useProjects();
  const { activeProjectId, setActiveProject, activeDocumentId, setActiveDocument } = useWorkspaceStore();
  const { data: documents } = useDocuments(activeProjectId);

  const createProject = useCreateProject();
  const renameProject = useRenameProject();
  const deleteProject = useDeleteProject();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();

  const [creatingProject, setCreatingProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [docMenuOpenId, setDocMenuOpenId] = useState<string | null>(null);
  const [deleteDocConfirmId, setDeleteDocConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject.mutate(newName.trim(), {
      onSuccess: (p) => {
        setActiveProject(p.id);
        setCreatingProject(false);
        setNewName('');
      },
    });
  };

  const handleRename = () => {
    if (!renamingId || !renameValue.trim()) return;
    renameProject.mutate({ id: renamingId, name: renameValue.trim() }, {
      onSuccess: () => {
        setRenamingId(null);
        setRenameValue('');
      },
    });
  };

  const handleDelete = () => {
    if (!deleteConfirmId) return;
    deleteProject.mutate(deleteConfirmId, {
      onSuccess: () => {
        if (activeProjectId === deleteConfirmId) {
          setActiveProject(null);
        }
        setDeleteConfirmId(null);
      },
    });
  };

  const handleDeleteDocument = () => {
    if (!deleteDocConfirmId || !activeProjectId) return;
    deleteDocument.mutate({ documentId: deleteDocConfirmId, projectId: activeProjectId }, {
      onSuccess: () => {
        if (activeDocumentId === deleteDocConfirmId) {
          setActiveDocument(null);
        }
        setDeleteDocConfirmId(null);
      },
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;
    uploadDocument.mutate({ projectId: activeProjectId, file });
    e.target.value = '';
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#E3E2DF] px-3 py-2 flex items-center justify-between">
        <img
          src="/logo.png"
          alt="ResearchHub"
          style={{ height: 36, width: 'auto' }}
          draggable={false}
        />
        <button
          onClick={onCollapse}
          title="Collapse sidebar"
          className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#A0A09A] hover:bg-[#EFEEEC] hover:text-[#1A1A1A] transition-colors duration-100"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="8,2 4,6 8,10" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between px-2 mb-1 mt-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[#A0A09A]">Projects</p>
          <button
            onClick={() => setCreatingProject(true)}
            className="text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors duration-100"
          >
            + New
          </button>
        </div>

        {creatingProject && (
          <div className="px-2 mb-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreatingProject(false); setNewName(''); }
              }}
              onBlur={() => { if (!newName.trim()) setCreatingProject(false); }}
              placeholder="Project name"
              className="w-full rounded border border-[#E3E2DF] bg-white px-2 py-1 text-sm text-[#1A1A1A] outline-none focus:border-[#2383E2]"
            />
          </div>
        )}

        {isLoading && <p className="px-2 text-xs text-[#A0A09A]">Loading…</p>}

        {projects?.map((p) => (
          <div key={p.id} className="relative group">
            {renamingId === p.id ? (
              <div className="px-2 mb-1">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={handleRename}
                  className="w-full rounded border border-[#E3E2DF] bg-white px-2 py-1 text-sm text-[#1A1A1A] outline-none focus:border-[#2383E2]"
                />
              </div>
            ) : (
              <div className="flex items-center">
                <button
                  onClick={() => setActiveProject(p.id)}
                  className={`flex-1 rounded px-2 py-1 text-left text-sm transition-colors duration-100 ${
                    activeProjectId === p.id
                      ? 'bg-[#EFEEEC] font-medium text-[#1A1A1A]'
                      : 'text-[#1A1A1A] hover:bg-[#EFEEEC]'
                  }`}
                >
                  {p.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === p.id ? null : p.id);
                  }}
                  className="invisible group-hover:visible px-1 text-[#A0A09A] hover:text-[#6B6B6B] text-sm"
                >
                  ···
                </button>
                {menuOpenId === p.id && (
                  <div className="absolute right-0 top-7 z-10 rounded border border-[#E3E2DF] bg-white py-1 shadow-sm text-sm">
                    <button
                      onClick={() => {
                        setRenamingId(p.id);
                        setRenameValue(p.name);
                        setMenuOpenId(null);
                      }}
                      className="w-full px-3 py-1 text-left text-[#1A1A1A] hover:bg-[#EFEEEC]"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmId(p.id);
                        setMenuOpenId(null);
                      }}
                      className="w-full px-3 py-1 text-left text-[#E03E3E] hover:bg-[#FDF2F2]"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {activeProjectId && (
          <>
            <div className="flex items-center justify-between px-2 mb-1 mt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-[#A0A09A]">Documents</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors duration-100"
              >
                {uploadDocument.isLoading ? <Spinner /> : '+ Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
              />
            </div>

            {documents?.map((d) => (
              <div key={d.id} className="relative group">
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveDocument(d.id)}
                    className={`flex-1 rounded px-2 py-1 text-left text-sm transition-colors duration-100 truncate ${
                      activeDocumentId === d.id
                        ? 'bg-[#EFEEEC] font-medium text-[#1A1A1A]'
                        : 'text-[#1A1A1A] hover:bg-[#EFEEEC]'
                    }`}
                    title={d.file_name}
                  >
                    {d.file_name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocMenuOpenId(docMenuOpenId === d.id ? null : d.id);
                    }}
                    className="invisible group-hover:visible px-1 text-[#A0A09A] hover:text-[#6B6B6B] text-sm"
                  >
                    ···
                  </button>
                  {docMenuOpenId === d.id && (
                    <div className="absolute right-0 top-7 z-10 rounded border border-[#E3E2DF] bg-white py-1 shadow-sm text-sm">
                      <button
                        onClick={() => {
                          setDeleteDocConfirmId(d.id);
                          setDocMenuOpenId(null);
                        }}
                        className="w-full px-3 py-1 text-left text-[#E03E3E] hover:bg-[#FDF2F2]"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {documents?.length === 0 && (
              <p className="px-2 text-xs text-[#A0A09A]">No documents yet</p>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-[#E3E2DF] px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-xs text-[#6B6B6B] truncate">{user?.email ?? ''}</span>
        <button
          onClick={() => { clearAuth(); navigate('/login', { replace: true }); }}
          className="text-xs text-[#6B6B6B] hover:text-[#E03E3E] transition-colors duration-100 shrink-0"
        >
          Sign out
        </button>
      </div>

      <Modal open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Delete project">
        <p className="mb-4 text-sm text-[#6B6B6B]">
          This will permanently delete the project and all its documents.
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      <Modal open={!!deleteDocConfirmId} onClose={() => setDeleteDocConfirmId(null)} title="Delete document">
        <p className="mb-4 text-sm text-[#6B6B6B]">
          This will permanently delete the document and all its annotations.
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setDeleteDocConfirmId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteDocument}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
