import { apiClient } from "../apiClient";

const BASE_PATH = "/api/v1/admin/dashboard";

export async function getOverview(params?: Record<string, unknown>) {
  const { data } = await apiClient.get(BASE_PATH, { params });
  return data;
}
