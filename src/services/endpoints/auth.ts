import { apiClient } from "../apiClient";

const BASE_PATH = "/api/v1/admin";

export async function login(payload: { email: string; password: string }) {
  const { data } = await apiClient.post(`${BASE_PATH}/login`, payload);
  return data;
}

export async function logout() {
  const { data } = await apiClient.post(`${BASE_PATH}/logout`);
  return data;
}
