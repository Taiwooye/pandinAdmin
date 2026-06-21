import { apiClient } from "../apiClient";

const BASE_PATH = "/api/v1/admin/room-types";

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
  const { data } = await apiClient.post(`${BASE_PATH}/${id}/media`, formData, {
    headers: { "Content-Type": undefined },
  });
  return data;
}

export async function deleteMedia(id: string, mediaId: string) {
  const { data } = await apiClient.delete(`${BASE_PATH}/${id}/media/${mediaId}`);
  return data;
}

export async function listUnits(id: string) {
  const { data } = await apiClient.get(`${BASE_PATH}/${id}/units`);
  return data;
}

export async function addUnit(id: string, payload: unknown) {
  const { data } = await apiClient.post(`${BASE_PATH}/${id}/units`, payload);
  return data;
}

export async function updateUnitStatus(id: string, unitId: string, payload: unknown) {
  const { data } = await apiClient.patch(`${BASE_PATH}/${id}/units/${unitId}`, payload);
  return data;
}

export async function deleteUnit(id: string, unitId: string) {
  const { data } = await apiClient.delete(`${BASE_PATH}/${id}/units/${unitId}`);
  return data;
}
