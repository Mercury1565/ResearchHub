import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from './client';
import type { CanvasMark, MarkType, MarkStyle, PenData, ArrowData, TextData } from '../types';

export function useCanvasMarks(documentId: string | null) {
  return useQuery<CanvasMark[]>(
    ['canvas-marks', documentId],
    () => apiClient.get(`documents/${documentId}/marks`).json<CanvasMark[]>(),
    { enabled: !!documentId }
  );
}

interface CreateCanvasMarkBody {
  documentId: string;
  page_number: number;
  mark_type: MarkType;
  data: PenData | ArrowData | TextData;
  style: MarkStyle;
}

export function useCreateCanvasMark() {
  const qc = useQueryClient();
  return useMutation(
    ({ documentId, ...body }: CreateCanvasMarkBody) =>
      apiClient.post(`documents/${documentId}/marks`, { json: body }).json<CanvasMark>(),
    {
      onSuccess: (data) => {
        qc.invalidateQueries(['canvas-marks', data.document_id]);
      },
    }
  );
}

interface UpdateCanvasMarkBody {
  id: string;
  documentId: string;
  data: PenData | ArrowData | TextData;
  style: MarkStyle;
}

export function useUpdateCanvasMark() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, data, style }: UpdateCanvasMarkBody) =>
      apiClient.put(`marks/${id}`, { json: { data, style } }).json<CanvasMark>(),
    {
      onSuccess: (data) => {
        qc.invalidateQueries(['canvas-marks', data.document_id]);
      },
    }
  );
}

export function useDeleteCanvasMark() {
  const qc = useQueryClient();
  return useMutation(
    ({ id }: { id: string; documentId: string }) =>
      apiClient.delete(`marks/${id}`),
    {
      onSuccess: (_data, vars) => {
        qc.invalidateQueries(['canvas-marks', vars.documentId]);
      },
    }
  );
}
