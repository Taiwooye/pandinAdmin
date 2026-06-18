import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as policiesApi from "@/services/endpoints/policies";

const POLICIES_KEY = ["policies"];

export function usePolicyList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...POLICIES_KEY, params],
    queryFn: () => policiesApi.list(params),
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => policiesApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}
