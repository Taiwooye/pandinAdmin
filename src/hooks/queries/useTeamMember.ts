import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as teamManagementApi from "@/services/endpoints/teamManagement";

const TEAMMANAGEMENT_KEY = ["teamManagement"];

export function useTeamMemberList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...TEAMMANAGEMENT_KEY, params],
    queryFn: () => teamManagementApi.list(params),
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teamManagementApi.invite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAMMANAGEMENT_KEY }),
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => teamManagementApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAMMANAGEMENT_KEY }),
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teamManagementApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAMMANAGEMENT_KEY }),
  });
}
