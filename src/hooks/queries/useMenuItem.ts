import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as barsMenuApi from "@/services/endpoints/barsMenu";

const BARSMENU_KEY = ["barsMenu"];

export function useMenuItemList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...BARSMENU_KEY, params],
    queryFn: () => barsMenuApi.list(params),
  });
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: [...BARSMENU_KEY, id],
    queryFn: () => barsMenuApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: barsMenuApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BARSMENU_KEY }),
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => barsMenuApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BARSMENU_KEY }),
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: barsMenuApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BARSMENU_KEY }),
  });
}
