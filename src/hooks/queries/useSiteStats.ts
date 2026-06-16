import { useQuery } from "@tanstack/react-query";
import * as siteStatsApi from "@/services/endpoints/siteStats";

export function useSiteStats() {
  return useQuery({
    queryKey: ["siteStats"],
    queryFn: () => siteStatsApi.getOverview(),
  });
}
