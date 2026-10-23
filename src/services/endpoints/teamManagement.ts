import { apiClient } from "../apiClient";

const BASE_PATH = "/api/v1/admin/team";

export async function list(params?: Record<string, unknown>) {
  const { data } = await apiClient.get(BASE_PATH, { params });
  return data;
}

// The backend generates the temporary password and emails it to the new staff member
export async function invite(payload: { name: string; email: string; role: string }) {
  const { data } = await apiClient.post(`${BASE_PATH}/invite`, payload);
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
