import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as siteStatsApi from "@/services/endpoints/siteStats";

const SITESTATS_KEY = ["siteStats"];

export function useSiteStatsList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...SITESTATS_KEY, params],
    queryFn: () => siteStatsApi.list(params),
  });
}

export function useUpdateSiteStat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => siteStatsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SITESTATS_KEY }),
  });
}
