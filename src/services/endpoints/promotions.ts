import { apiClient } from "../apiClient";

const BASE_PATH = "/api/v1/admin/promotions";

export async function list(params?: Record<string, unknown>) {
  const { data } = await apiClient.get(BASE_PATH, { params });
  return data;
}

export async function getById(id: string) {
  const { data } = await apiClient.get(`${BASE_PATH}/${id}`);
  return data;
}

export async function create(payload: unknown) {
  const { data } = await apiClient.post(BASE_PATH, payload);
  return data;
}

export async function update(id: string, payload: unknown) {
  const { data } = await apiClient.put(`${BASE_PATH}/${id}`, payload);
  return data;
}

export async function remove(id: string) {
  const { data } = await apiClient.delete(`${BASE_PATH}/${id}`);
  return data;
}

export async function reorder(items: { id: number; sort_order: number }[]) {
  const { data } = await apiClient.patch(`${BASE_PATH}/reorder`, { items });
  return data;
}
