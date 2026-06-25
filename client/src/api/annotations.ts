import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from './client';
import type { Annotation, Coordinates, FontStyle, FontSize } from '../types';

export function useAnnotations(documentId: string | null) {
  return useQuery<Annotation[]>(
    ['annotations', documentId],
    () => apiClient.get(`documents/${documentId}/annotations`).json<Annotation[]>(),
    { enabled: !!documentId }
  );
}

interface CreateAnnotationBody {
  page_number: number;
  selection_txt: string;
  coordinates: Coordinates;
  note_content?: string | null;
  font_style: FontStyle;
  font_size: FontSize;
}

export function useCreateAnnotation() {
  const qc = useQueryClient();
  return useMutation(
    ({ documentId, ...body }: CreateAnnotationBody & { documentId: string }) =>
      apiClient.post(`documents/${documentId}/annotations`, { json: body }).json<Annotation>(),
    {
      onSuccess: (data) => {
        qc.invalidateQueries(['annotations', data.document_id]);
      },
    }
  );
}

interface UpdateAnnotationBody {
  note_content?: string | null;
  font_style: FontStyle;
  font_size: FontSize;
}

export function useUpdateAnnotation() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, ...body }: UpdateAnnotationBody & { id: string }) =>
      apiClient.put(`annotations/${id}`, { json: body }).json<Annotation>(),
    {
      onSuccess: (data) => {
        qc.invalidateQueries(['annotations', data.document_id]);
      },
    }
  );
}

export function useDeleteAnnotation() {
  const qc = useQueryClient();
  return useMutation(
    ({ id }: { id: string; documentId: string }) =>
      apiClient.delete(`annotations/${id}`),
    {
      onSuccess: (_data, vars) => {
        qc.invalidateQueries(['annotations', vars.documentId]);
      },
    }
  );
}
