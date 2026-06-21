import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as permissionsApi from "@/services/endpoints/permissions";

const PERMISSIONS_KEY = ["permissions"];

export function usePermissionsMatrix() {
  return useQuery({
    queryKey: PERMISSIONS_KEY,
    queryFn: permissionsApi.getMatrix,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, permissions }: { role: string; permissions: Record<string, boolean> }) =>
      permissionsApi.updateRole(role, permissions),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PERMISSIONS_KEY }),
  });
}
