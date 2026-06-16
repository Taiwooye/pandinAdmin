import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as damageChargesApi from "@/services/endpoints/damageCharges";

const DAMAGECHARGES_KEY = ["damageCharges"];

export function useDamageChargeList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...DAMAGECHARGES_KEY, params],
    queryFn: () => damageChargesApi.list(params),
  });
}

export function useDamageCharge(id: string) {
  return useQuery({
    queryKey: [...DAMAGECHARGES_KEY, id],
    queryFn: () => damageChargesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateDamageCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: damageChargesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DAMAGECHARGES_KEY }),
  });
}

export function useUpdateDamageCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => damageChargesApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DAMAGECHARGES_KEY }),
  });
}

export function useDeleteDamageCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: damageChargesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DAMAGECHARGES_KEY }),
  });
}
