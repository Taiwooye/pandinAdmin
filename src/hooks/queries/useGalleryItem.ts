import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as galleryApi from "@/services/endpoints/gallery";

const GALLERY_KEY = ["gallery"];

export function useGalleryItemList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...GALLERY_KEY, params],
    queryFn: () => galleryApi.list(params),
  });
}

export function useUploadGalleryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: galleryApi.upload,
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

export function useReorderGalleryItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: galleryApi.reorder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GALLERY_KEY }),
  });
}
