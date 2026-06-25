import { useCallback } from 'react';
import { useWorkspaceStore } from '../store/workspace';
import { useAnnotationStore } from '../store/annotations';

export function useDeepLink() {
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const setActiveDocument = useWorkspaceStore((s) => s.setActiveDocument);
  const setActivePage = useWorkspaceStore((s) => s.setActivePage);
  const flashAnnotation = useAnnotationStore((s) => s.flashAnnotation);

  const navigateDeepLink = useCallback(
    (uri: string) => {
      const match = uri.match(
        /researchhub:\/\/project\/([^/]+)\/doc\/([^?]+)\?page=(\d+)&highlight=(.+)/
      );
      if (!match) return;

      const [, projectId, docId, pageStr, annotationId] = match;
      const page = parseInt(pageStr, 10);

      setActiveProject(projectId);
      setActiveDocument(docId);
      setActivePage(page);

      setTimeout(() => flashAnnotation(annotationId), 500);
    },
    [setActiveProject, setActiveDocument, setActivePage, flashAnnotation]
  );

  return { navigateDeepLink };
}
