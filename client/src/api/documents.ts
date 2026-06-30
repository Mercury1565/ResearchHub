import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from './client';
import type { Document } from '../types';

export function useDocuments(projectId: string | null) {
  return useQuery<Document[]>(
    ['documents', projectId],
    () => apiClient.get(`projects/${projectId}/documents`).json<Document[]>(),
    { enabled: !!projectId }
  );
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation(
    ({ projectId, file }: { projectId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return apiClient
        .post(`projects/${projectId}/documents`, {
          body: form,
          headers: { 'Content-Type': undefined as unknown as string },
        })
        .json<Document>();
    },
    {
      onSuccess: (_data, vars) => {
        qc.invalidateQueries(['documents', vars.projectId]);
      },
    }
  );
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation(
    ({ documentId }: { documentId: string; projectId: string }) =>
      apiClient.delete(`documents/${documentId}`).json(),
    {
      onSuccess: (_data, vars) => {
        qc.invalidateQueries(['documents', vars.projectId]);
      },
    }
  );
}

export function useDocumentFileUrl(documentId: string | null) {
  return useQuery<{ url: string }>(
    ['document-file', documentId],
    () => apiClient.get(`documents/${documentId}/file`).json<{ url: string }>(),
    { enabled: !!documentId, staleTime: 10 * 60 * 1000 }
  );
}
