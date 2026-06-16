import { useQuery } from "@tanstack/react-query";
import * as dashboardApi from "@/services/endpoints/dashboard";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.getOverview(),
  });
}
