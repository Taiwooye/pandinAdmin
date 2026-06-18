import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as recreationApi from "@/services/endpoints/recreation";

const RECREATION_KEY = ["recreation"];

export function useRecreationItemList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...RECREATION_KEY, params],
    queryFn: () => recreationApi.list(params),
  });
}

export function useRecreationItem(id: string) {
  return useQuery({
    queryKey: [...RECREATION_KEY, id],
    queryFn: () => recreationApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateRecreationItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recreationApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECREATION_KEY }),
  });
}

export function useUpdateRecreationItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => recreationApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECREATION_KEY }),
  });
}

export function useReorderRecreationItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recreationApi.reorder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECREATION_KEY }),
  });
}
