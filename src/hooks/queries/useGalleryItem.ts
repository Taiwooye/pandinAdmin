import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as galleryApi from "@/services/endpoints/gallery";

const GALLERY_KEY = ["gallery"];

export function useGalleryItemList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GALLERY_KEY, params],
    queryFn: () => galleryApi.list(params),
  });
}

export function useGalleryItem(id: string) {
  return useQuery({
    queryKey: [...GALLERY_KEY, id],
    queryFn: () => galleryApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateGalleryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: galleryApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GALLERY_KEY }),
  });
}

export function useUpdateGalleryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => galleryApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GALLERY_KEY }),
  });
}

export function useDeleteGalleryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: galleryApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GALLERY_KEY }),
  });
}
