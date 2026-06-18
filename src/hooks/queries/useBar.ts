import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as barsApi from "@/services/endpoints/barsMenu";

const BARS_KEY = ["bars"];

export function useBarList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...BARS_KEY, params],
    queryFn: () => barsApi.list(params),
  });
}

export function useBar(id: string) {
  return useQuery({
    queryKey: [...BARS_KEY, id],
    queryFn: () => barsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: barsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BARS_KEY }),
  });
}

export function useUpdateBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => barsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BARS_KEY }),
  });
}

export function useDeleteBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: barsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BARS_KEY }),
  });
}

export function useUploadBarMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => barsApi.uploadMedia(id, formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BARS_KEY }),
  });
}

export function useDeleteBarMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mediaId }: { id: string; mediaId: string }) => barsApi.deleteMedia(id, mediaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BARS_KEY }),
  });
}

export function useReorderBars() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: barsApi.reorder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BARS_KEY }),
  });
}
