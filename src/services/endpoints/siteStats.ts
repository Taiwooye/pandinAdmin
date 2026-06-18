import { apiClient } from "../apiClient";

const BASE_PATH = "/api/v1/admin/stats";

export async function list(params?: Record<string, unknown>) {
  const { data } = await apiClient.get(BASE_PATH, { params });
  return data;
}

export async function update(id: string, payload: unknown) {
  const { data } = await apiClient.put(`${BASE_PATH}/${id}`, payload);
  return data;
}
