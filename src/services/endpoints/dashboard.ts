import { apiClient } from "../apiClient";

// TODO: confirm with backend — path inferred from "Dashboard" in the Admin API collection
const BASE_PATH = "/api/v1/admin/dashboard";

export async function getOverview(params?: Record<string, unknown>) {
  const { data } = await apiClient.get(BASE_PATH, { params });
  return data;
}
