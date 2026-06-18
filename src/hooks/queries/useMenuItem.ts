import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as barsApi from "@/services/endpoints/barsMenu";

const MENU_KEY = ["menuItems"];

export function useMenuItemList(barId: string) {
  return useQuery({
    queryKey: [...MENU_KEY, barId],
    queryFn: () => barsApi.listMenuItems(barId),
    enabled: !!barId,
  });
}

export function useAddMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ barId, payload }: { barId: string; payload: unknown }) => barsApi.addMenuItem(barId, payload),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: [...MENU_KEY, variables.barId] }),
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ barId, itemId, payload }: { barId: string; itemId: string; payload: unknown }) =>
      barsApi.updateMenuItem(barId, itemId, payload),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: [...MENU_KEY, variables.barId] }),
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ barId, itemId }: { barId: string; itemId: string }) => barsApi.deleteMenuItem(barId, itemId),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: [...MENU_KEY, variables.barId] }),
  });
}
