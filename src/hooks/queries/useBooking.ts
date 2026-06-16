import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as bookingsApi from "@/services/endpoints/bookings";

const BOOKINGS_KEY = ["bookings"];

export function useBookingList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...BOOKINGS_KEY, params],
    queryFn: () => bookingsApi.list(params),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: [...BOOKINGS_KEY, id],
    queryFn: () => bookingsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY }),
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => bookingsApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY }),
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKINGS_KEY }),
  });
}
