import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from './client';
import type { Project } from '../types';

export function useProjects() {
  return useQuery<Project[]>(['projects'], () =>
    apiClient.get('projects').json<Project[]>()
  );
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation(
    (name: string) => apiClient.post('projects', { json: { name } }).json<Project>(),
    { onSuccess: () => qc.invalidateQueries(['projects']) }
  );
}

export function useRenameProject() {
  const qc = useQueryClient();
  return useMutation(
    ({ id, name }: { id: string; name: string }) =>
      apiClient.put(`projects/${id}`, { json: { name } }).json<Project>(),
    { onSuccess: () => qc.invalidateQueries(['projects']) }
  );
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation(
    (id: string) => apiClient.delete(`projects/${id}`).json(),
    { onSuccess: () => qc.invalidateQueries(['projects']) }
  );
}
