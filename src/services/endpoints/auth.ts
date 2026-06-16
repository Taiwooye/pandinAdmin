import { apiClient } from "../apiClient";

const LOGIN_PATH = "/api/v1/admin/login";

// TODO: confirm with backend — not yet verified against the Admin API collection
const BASE_PATH = "/api/v1/admin";

export async function login(payload: { email: string; password: string }) {
  const { data } = await apiClient.post(LOGIN_PATH, payload);
  return data;
}

export async function logout() {
  const { data } = await apiClient.post(`${BASE_PATH}/logout`);
  return data;
}

export async function getMe() {
  const { data } = await apiClient.get(`${BASE_PATH}/me`);
  return data;
}
