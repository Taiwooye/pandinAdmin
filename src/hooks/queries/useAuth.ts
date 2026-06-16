import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/services/endpoints/auth";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => queryClient.clear(),
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: authApi.getMe,
  });
}
