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

export function useUploadRoomTypeMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => roomTypesApi.uploadMedia(id, formData),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: [...ROOMTYPES_KEY, variables.id] }),
  });
}

export function useDeleteRoomTypeMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mediaId }: { id: string; mediaId: string }) => roomTypesApi.deleteMedia(id, mediaId),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: [...ROOMTYPES_KEY, variables.id] }),
  });
}

export function useRoomTypeUnits(id: string) {
  return useQuery({
    queryKey: [...ROOMTYPES_KEY, id, "units"],
    queryFn: () => roomTypesApi.listUnits(id),
    enabled: !!id,
  });
}

export function useAddRoomTypeUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => roomTypesApi.addUnit(id, payload),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: [...ROOMTYPES_KEY, variables.id, "units"] }),
  });
}

export function useUpdateRoomTypeUnitStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, unitId, payload }: { id: string; unitId: string; payload: unknown }) =>
      roomTypesApi.updateUnitStatus(id, unitId, payload),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: [...ROOMTYPES_KEY, variables.id, "units"] }),
  });
}

export function useDeleteRoomTypeUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, unitId }: { id: string; unitId: string }) => roomTypesApi.deleteUnit(id, unitId),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: [...ROOMTYPES_KEY, variables.id, "units"] }),
  });
}
