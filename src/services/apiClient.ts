import axios from "axios";

export const TOKEN_KEY = "pandin_admin_token";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://pandin-group-production.up.railway.app",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiMessage = error?.response?.data?.message;
    if (apiMessage && typeof apiMessage === "string") {
      error.message = apiMessage;
    }
    return Promise.reject(error);
  }
);
