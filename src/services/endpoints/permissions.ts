import { apiClient } from "../apiClient";

const BASE_PATH = "/api/v1/admin/permissions";

export async function getMatrix() {
  const { data } = await apiClient.get(BASE_PATH);
  return data;
}

export async function updateRole(role: string, permissions: Record<string, boolean>) {
  const { data } = await apiClient.put(`${BASE_PATH}/${role}`, { permissions });
  return data;
}
