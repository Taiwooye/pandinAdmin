import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as roomTypesApi from "@/services/endpoints/roomTypes";

const ROOMTYPES_KEY = ["roomTypes"];

export function useRoomTypeList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...ROOMTYPES_KEY, params],
    queryFn: () => roomTypesApi.list(params),
  });
}

export function useRoomType(id: string) {
  return useQuery({
    queryKey: [...ROOMTYPES_KEY, id],
    queryFn: () => roomTypesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: roomTypesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOMTYPES_KEY }),
  });
}

export function useUpdateRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => roomTypesApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOMTYPES_KEY }),
  });
}

export function useDeleteRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: roomTypesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOMTYPES_KEY }),
  });
}
