import { apiClient } from "../apiClient";

const BASE_PATH = "/api/v1/admin/bars";

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

export async function uploadMedia(id: string, formData: FormData) {
  const { data } = await apiClient.post(`${BASE_PATH}/${id}/media`, formData);
  return data;
}

export async function deleteMedia(id: string, mediaId: string) {
  const { data } = await apiClient.delete(`${BASE_PATH}/${id}/media/${mediaId}`);
  return data;
}

export async function reorder(items: { id: number; sort_order: number }[]) {
  const { data } = await apiClient.patch(`${BASE_PATH}/reorder`, { items });
  return data;
}

export async function listMenuItems(barId: string) {
  const { data } = await apiClient.get(`${BASE_PATH}/${barId}/menu`);
  return data;
}

export async function addMenuItem(barId: string, payload: unknown) {
  const { data } = await apiClient.post(`${BASE_PATH}/${barId}/menu`, payload);
  return data;
}

export async function updateMenuItem(barId: string, itemId: string, payload: unknown) {
  const { data } = await apiClient.put(`${BASE_PATH}/${barId}/menu/${itemId}`, payload);
  return data;
}

export async function deleteMenuItem(barId: string, itemId: string) {
  const { data } = await apiClient.delete(`${BASE_PATH}/${barId}/menu/${itemId}`);
  return data;
}
