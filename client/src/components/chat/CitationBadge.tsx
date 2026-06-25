import type { Citation } from '../../types';
import { useWorkspaceStore } from '../../store/workspace';

interface Props {
  citation: Citation;
}

export default function CitationBadge({ citation }: Props) {
  const setActiveDocument = useWorkspaceStore((s) => s.setActiveDocument);
  const setActivePage = useWorkspaceStore((s) => s.setActivePage);

  const handleClick = () => {
    setActiveDocument(citation.doc_id);
    setActivePage(citation.page_number);
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-[#2383E2] bg-[#EDF3FC] hover:bg-[#dbe8f8] transition-colors duration-100"
    >
      {citation.document_title}, p.{citation.page_number}
    </button>
  );
}
