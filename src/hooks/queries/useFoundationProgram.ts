import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as foundationProgramsApi from "@/services/endpoints/foundationPrograms";

const FOUNDATIONPROGRAMS_KEY = ["foundationPrograms"];

export function useFoundationProgramList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...FOUNDATIONPROGRAMS_KEY, params],
    queryFn: () => foundationProgramsApi.list(params),
  });
}

export function useFoundationProgram(id: string) {
  return useQuery({
    queryKey: [...FOUNDATIONPROGRAMS_KEY, id],
    queryFn: () => foundationProgramsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateFoundationProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: foundationProgramsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOUNDATIONPROGRAMS_KEY }),
  });
}

export function useUpdateFoundationProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => foundationProgramsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOUNDATIONPROGRAMS_KEY }),
  });
}

export function useDeleteFoundationProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: foundationProgramsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOUNDATIONPROGRAMS_KEY }),
  });
}

export function useReorderFoundationPrograms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: foundationProgramsApi.reorder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FOUNDATIONPROGRAMS_KEY }),
  });
}
