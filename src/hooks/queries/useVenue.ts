import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as venuesApi from "@/services/endpoints/venues";

const VENUES_KEY = ["venues"];

export function useVenueList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...VENUES_KEY, params],
    queryFn: () => venuesApi.list(params),
  });
}

export function useVenue(id: string) {
  return useQuery({
    queryKey: [...VENUES_KEY, id],
    queryFn: () => venuesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: venuesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VENUES_KEY }),
  });
}

export function useUpdateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => venuesApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VENUES_KEY }),
  });
}

export function useDeleteVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: venuesApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VENUES_KEY }),
  });
}

export function useUploadVenueMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => venuesApi.uploadMedia(id, formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VENUES_KEY }),
  });
}

export function useDeleteVenueMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mediaId }: { id: string; mediaId: string }) => venuesApi.deleteMedia(id, mediaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VENUES_KEY }),
  });
}

export function useReorderVenues() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: venuesApi.reorder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VENUES_KEY }),
  });
}
