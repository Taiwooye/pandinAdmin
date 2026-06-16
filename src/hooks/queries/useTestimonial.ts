import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as testimonialsApi from "@/services/endpoints/testimonials";

const TESTIMONIALS_KEY = ["testimonials"];

export function useTestimonialList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...TESTIMONIALS_KEY, params],
    queryFn: () => testimonialsApi.list(params),
  });
}

export function useTestimonial(id: string) {
  return useQuery({
    queryKey: [...TESTIMONIALS_KEY, id],
    queryFn: () => testimonialsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: testimonialsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TESTIMONIALS_KEY }),
  });
}

export function useUpdateTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => testimonialsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TESTIMONIALS_KEY }),
  });
}

export function useDeleteTestimonial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: testimonialsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TESTIMONIALS_KEY }),
  });
}
