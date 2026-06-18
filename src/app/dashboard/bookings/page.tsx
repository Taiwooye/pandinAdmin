"use client";

import { useMemo, useState } from "react";
import { useBooking, useBookingList, useUpdateBooking } from "@/hooks/queries/useBooking";

type BookingListItem = {
  id: number;
  booking_ref: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  service_type: { value: string; label: string };
  room_type_id: number | null;
  venue_id: number | null;
  bar_venue_id: number | null;
  check_in_date: string | null;
  check_out_date: string | null;
  event_date: string | null;
  event_type: string | null;
  reservation_date: string | null;
  reservation_time: string | null;
  num_guests: number;
  message: string | null;
  status: { value: string; label: string };
  payment_status: { value: string; label: string };
  admin_notes: string | null;
  created_at: string;
};

type BookingDetail = BookingListItem & {
  room_type_name?: string | null;
  venue_name?: string | null;
  bar_venue_name?: string | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "awaiting", label: "Awaiting" },
  { value: "verified", label: "Verified" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "All Payments" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
];

const SERVICE_OPTIONS = [
  { value: "", label: "All Services" },
  { value: "hotel", label: "Hotel" },
  { value: "apartment", label: "Apartment" },
  { value: "event_hall", label: "Event Hall" },
  { value: "lounge_bar", label: "Lounge & Bar" },
];

const statusBadge: Record<string, string> = {
  awaiting: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
};

const paymentBadge: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600",
  verified: "bg-green-100 text-green-700",
};

function venueLabel(b: BookingListItem | BookingDetail) {
  const d = b as BookingDetail;
  return d.room_type_name ?? d.venue_name ?? d.bar_venue_name ?? "—";
}

function relevantDate(b: BookingListItem) {
  return b.check_in_date ?? b.event_date ?? b.reservation_date ?? "—";
}

export default function BookingsPage() {
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page };
    if (status) p.status = status;
    if (paymentStatus) p.payment_status = paymentStatus;
    if (serviceType) p.service_type = serviceType;
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    return p;
  }, [page, status, paymentStatus, serviceType, dateFrom, dateTo]);

  const { data, isLoading, isError } = useBookingList(params);
  const bookingsData = data?.data;
  const meta = data?.meta;

  function updateFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const filtered = useMemo(() => {
    const list = bookingsData ?? [];
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((b) =>
      b.guest_name?.toLowerCase().includes(q) ||
      b.guest_email?.toLowerCase().includes(q) ||
      b.guest_phone?.includes(q) ||
      b.booking_ref?.toLowerCase().includes(q)
    );
  }, [search, bookingsData]);

  const { data: detailData, isLoading: detailLoading } = useBooking(selectedId ? String(selectedId) : "");
  const detail: BookingDetail | undefined = detailData?.data;
  const updateBooking = useUpdateBooking();

  function handleSave(payload: { status: string; payment_status: string; admin_notes: string }) {
    if (!selectedId) return;
    updateBooking.mutate(
      { id: String(selectedId), payload },
      { onSuccess: () => setSelectedId(null) }
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Booking Log</h1>
        <p className="text-slate-500 text-sm mt-1">
          Track receipt confirmations sent to guests. Verify the bank transfer before marking payment as verified.
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex gap-3 mb-6">
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm shadow-sm">
          <span className="text-slate-400">Matching bookings</span>
          <span className="ml-2 font-bold text-slate-800">{meta?.total ?? 0}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search this page by guest name, email, phone, or ref…"
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-slate-400"
        />
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => updateFilter(setStatus, o.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                status === o.value ? "bg-[#5A0E24] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {PAYMENT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => updateFilter(setPaymentStatus, o.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                paymentStatus === o.value ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {SERVICE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => updateFilter(setServiceType, o.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                serviceType === o.value ? "bg-amber-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center flex-wrap text-sm">
          <label className="flex items-center gap-2 text-slate-500">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => updateFilter(setDateFrom, e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="flex items-center gap-2 text-slate-500">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => updateFilter(setDateTo, e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          {(status || paymentStatus || serviceType || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setStatus("");
                setPaymentStatus("");
                setServiceType("");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
              className="text-xs font-semibold text-[#5A0E24] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              {["Ref", "Guest", "Service", "Room / Venue", "Date", "Guests", "Status", "Payment"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  Loading bookings…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-red-500">
                  Failed to load bookings.
                </td>
              </tr>
            )}
            {!isLoading && !isError && filtered.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.booking_ref}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{b.guest_name}</p>
                  <p className="text-xs text-slate-400">{b.guest_email}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{b.service_type?.label}</td>
                <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">{venueLabel(b)}</td>
                <td className="px-4 py-3 text-slate-600">{relevantDate(b)}</td>
                <td className="px-4 py-3 text-slate-600">{b.num_guests}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[b.status?.value] ?? "bg-slate-100 text-slate-500"}`}>
                    {b.status?.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${paymentBadge[b.payment_status?.value] ?? "bg-slate-100 text-slate-500"}`}>
                    {b.payment_status?.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedId(b.id)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !isError && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>
              Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total}
            </span>
            <div className="flex items-center gap-3">
              <button
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:border-slate-300"
              >
                Prev
              </button>
              <span>
                Page {meta.current_page} of {meta.last_page}
              </span>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:border-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail / edit modal */}
      {selectedId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <div className="py-12 text-center text-slate-400">Loading details…</div>
            ) : (
              <BookingDetailModal
                key={detail.id}
                booking={detail}
                onClose={() => setSelectedId(null)}
                onSave={handleSave}
                saving={updateBooking.isPending}
                saveError={updateBooking.isError}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BookingDetailModal({
  booking,
  onClose,
  onSave,
  saving,
  saveError,
}: {
  booking: BookingDetail;
  onClose: () => void;
  onSave: (payload: { status: string; payment_status: string; admin_notes: string }) => void;
  saving: boolean;
  saveError: boolean;
}) {
  const [editStatus, setEditStatus] = useState(booking.status.value);
  const [editPayment, setEditPayment] = useState(booking.payment_status.value);
  const [editNotes, setEditNotes] = useState(booking.admin_notes ?? "");

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-slate-800">Booking {booking.booking_ref}</h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[booking.status.value] ?? "bg-slate-100 text-slate-500"}`}>
          {booking.status.label}
        </span>
      </div>

      <div className="space-y-3 text-sm">
        {[
          ["Guest", booking.guest_name],
          ["Email", booking.guest_email],
          ["Phone", booking.guest_phone],
          ["Service", booking.service_type?.label],
          ["Room / Venue", venueLabel(booking)],
          ["Check-in", booking.check_in_date ?? "—"],
          ["Check-out", booking.check_out_date ?? "—"],
          ["Event date", booking.event_date ?? "—"],
          ["Reservation", booking.reservation_date && booking.reservation_time ? `${booking.reservation_date} ${booking.reservation_time}` : "—"],
          ["Guests", booking.num_guests],
        ].map(([l, v]) => (
          <div key={l} className="flex gap-3">
            <span className="text-slate-400 w-28 shrink-0">{l}</span>
            <span className="text-slate-800 font-medium">{v}</span>
          </div>
        ))}
        {booking.message && (
          <div className="flex gap-3">
            <span className="text-slate-400 w-28 shrink-0">Message</span>
            <span className="text-slate-600 italic">{booking.message}</span>
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Status</label>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {editStatus === "cancelled" && (
            <p className="text-xs text-amber-600 mt-1">Saving as cancelled sends a cancellation email to the guest.</p>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Payment status</label>
          <select
            value={editPayment}
            onChange={(e) => setEditPayment(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {PAYMENT_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Admin notes</label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={() => onSave({ status: editStatus, payment_status: editPayment, admin_notes: editNotes })}
          disabled={saving}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Close
        </button>
      </div>
      {saveError && (
        <p className="text-xs text-red-500 mt-2">Failed to save changes. Please try again.</p>
      )}
    </>
  );
}
