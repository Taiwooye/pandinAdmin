import { useQuery } from "@tanstack/react-query";
import * as dashboardApi from "@/services/endpoints/dashboard";

export function useDashboard(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["dashboard", params],
    queryFn: () => dashboardApi.getOverview(params),
  });
}
