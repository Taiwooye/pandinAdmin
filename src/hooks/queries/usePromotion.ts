import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as promotionsApi from "@/services/endpoints/promotions";

const PROMOTIONS_KEY = ["promotions"];

export function usePromotionList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...PROMOTIONS_KEY, params],
    queryFn: () => promotionsApi.list(params),
  });
}

export function usePromotion(id: string) {
  return useQuery({
    queryKey: [...PROMOTIONS_KEY, id],
    queryFn: () => promotionsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: promotionsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROMOTIONS_KEY }),
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => promotionsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROMOTIONS_KEY }),
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: promotionsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROMOTIONS_KEY }),
  });
}
