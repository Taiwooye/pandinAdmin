import { apiClient } from "../apiClient";

const BASE_PATH = "/api/v1/admin/bookings";

export async function list(params?: Record<string, unknown>) {
  const { data } = await apiClient.get(BASE_PATH, { params });
  return data;
}

export async function getById(id: string) {
  const { data } = await apiClient.get(`${BASE_PATH}/${id}`);
  return data;
}

export async function update(id: string, payload: unknown) {
  const { data } = await apiClient.patch(`${BASE_PATH}/${id}`, payload);
  return data;
}
