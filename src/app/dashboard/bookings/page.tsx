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
  { value: "", label: "All" },
  { value: "awaiting", label: "Awaiting" },
  { value: "verified", label: "Verified" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
];

const SERVICE_OPTIONS = [
  { value: "", label: "All" },
  { value: "hotel", label: "Hotel" },
  { value: "apartment", label: "Apartment" },
  { value: "event_hall", label: "Event Hall" },
  { value: "lounge_bar", label: "Lounge & Bar" },
];

const statusBadge: Record<string, string> = {
  awaiting: "bg-amber-100 text-amber-700 border border-amber-200",
  verified: "bg-green-100 text-green-700 border border-green-200",
  cancelled: "bg-slate-100 text-slate-500 border border-slate-200",
};

const paymentBadge: Record<string, string> = {
  pending: "bg-orange-50 text-orange-600 border border-orange-100",
  verified: "bg-emerald-50 text-emerald-700 border border-emerald-100",
};

const serviceIcon: Record<string, string> = {
  hotel: "🏨",
  apartment: "🏠",
  event_hall: "🎪",
  lounge_bar: "🍸",
};

function venueLabel(b: BookingListItem | BookingDetail) {
  const d = b as BookingDetail;
  return d.room_type_name ?? d.venue_name ?? d.bar_venue_name ?? "—";
}

function relevantDate(b: BookingListItem) {
  return b.check_in_date ?? b.event_date ?? b.reservation_date ?? "—";
}

function FilterPill({
  label,
  active,
  onClick,
  activeClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active
          ? `${activeClass} shadow-sm`
          : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
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
    const list: BookingListItem[] = bookingsData ?? [];
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.guest_name?.toLowerCase().includes(q) ||
        b.guest_email?.toLowerCase().includes(q) ||
        b.guest_phone?.includes(q) ||
        b.booking_ref?.toLowerCase().includes(q)
    );
  }, [search, bookingsData]);

  const activeFilterCount = [status, paymentStatus, serviceType, dateFrom, dateTo].filter(Boolean).length;

  const { data: detailData, isLoading: detailLoading } = useBooking(selectedId ? String(selectedId) : "");
  const detail: BookingDetail | undefined = detailData?.data;
  const updateBooking = useUpdateBooking();

  function handleSave(payload: { status: string; payment_status: string; admin_notes: string }) {
    if (!selectedId) return;
    updateBooking.mutate({ id: String(selectedId), payload }, { onSuccess: () => setSelectedId(null) });
  }

  function clearAllFilters() {
    setStatus("");
    setPaymentStatus("");
    setServiceType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="max-w-[1400px]">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Booking Log</h1>
          <p className="text-slate-500 text-sm mt-1">
            Verify bank transfers before marking payment as verified. Cancellations notify the guest by email.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <span className="text-slate-400 text-sm">Total bookings</span>
          <span className="text-lg font-bold text-slate-800">{meta?.total ?? "—"}</span>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span className="text-sm font-semibold text-slate-600">Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#5A0E24] text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} className="text-xs font-semibold text-[#5A0E24] hover:text-[#7a1230] transition-colors">
              Clear all
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {/* Booking status */}
          <div className="flex items-start gap-6 px-5 py-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1.5 w-28 shrink-0">
              Booking status
            </span>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((o) => (
                <FilterPill
                  key={o.value}
                  label={o.label}
                  active={status === o.value}
                  onClick={() => updateFilter(setStatus, o.value)}
                  activeClass="bg-[#5A0E24] text-white border border-[#5A0E24]"
                />
              ))}
            </div>
          </div>

          {/* Payment status */}
          <div className="flex items-start gap-6 px-5 py-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1.5 w-28 shrink-0">
              Payment
            </span>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_OPTIONS.map((o) => (
                <FilterPill
                  key={o.value}
                  label={o.label}
                  active={paymentStatus === o.value}
                  onClick={() => updateFilter(setPaymentStatus, o.value)}
                  activeClass="bg-emerald-700 text-white border border-emerald-700"
                />
              ))}
            </div>
          </div>

          {/* Service type */}
          <div className="flex items-start gap-6 px-5 py-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-1.5 w-28 shrink-0">
              Service
            </span>
            <div className="flex gap-2 flex-wrap">
              {SERVICE_OPTIONS.map((o) => (
                <FilterPill
                  key={o.value}
                  label={o.label}
                  active={serviceType === o.value}
                  onClick={() => updateFilter(setServiceType, o.value)}
                  activeClass="bg-amber-600 text-white border border-amber-600"
                />
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-6 px-5 py-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 shrink-0">
              Date range
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => updateFilter(setDateFrom, e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => updateFilter(setDateTo, e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { updateFilter(setDateFrom, ""); updateFilter(setDateTo, ""); }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕ Clear dates
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search + result count row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or ref…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {!isLoading && (
          <span className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{search ? filtered.length : (meta?.total ?? 0)}</span>
            {search ? " results on this page" : " bookings"}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ref</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Guest</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Service</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Room / Venue</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Guests</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm">Loading bookings…</span>
                    </div>
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-red-500 text-sm">
                    Failed to load bookings. Please try again.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && filtered.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-amber-50/40 transition-colors group cursor-pointer"
                  onClick={() => setSelectedId(b.id)}
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-400 font-medium">{b.booking_ref}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800 leading-snug">{b.guest_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{b.guest_email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 text-xs font-medium bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md">
                      <span>{serviceIcon[b.service_type?.value] ?? "📋"}</span>
                      {b.service_type?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-sm max-w-[140px] truncate">{venueLabel(b)}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-sm tabular-nums">{relevantDate(b)}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-sm">{b.num_guests}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${statusBadge[b.status?.value] ?? "bg-slate-100 text-slate-500"}`}>
                      {b.status?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${paymentBadge[b.payment_status?.value] ?? "bg-slate-100 text-slate-500"}`}>
                      {b.payment_status?.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedId(b.id); }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && !isError && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-sm">No bookings match your filters.</span>
                      {activeFilterCount > 0 && (
                        <button onClick={clearAllFilters} className="text-xs font-semibold text-[#5A0E24] hover:underline mt-1">
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/40">
            <span className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{meta.from ?? 0}–{meta.to ?? 0}</span> of <span className="font-semibold text-slate-700">{meta.total}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-slate-500">
                {meta.current_page} / {meta.last_page}
              </span>
              <button
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail / edit modal */}
      {selectedId && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="py-16 text-center text-slate-400 text-sm">Loading details…</div>
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

  const rows: [string, string | number | null | undefined][] = [
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
  ];

  return (
    <>
      {/* Modal header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-slate-400 font-mono mb-0.5">{booking.booking_ref}</p>
          <h3 className="font-bold text-slate-800 text-lg leading-tight">{booking.guest_name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${statusBadge[booking.status.value] ?? "bg-slate-100 text-slate-500"}`}>
            {booking.status.label}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Booking details */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 mb-5">
        {rows.map(([l, v]) => (
          <div key={l} className="flex gap-3 text-sm">
            <span className="text-slate-400 w-28 shrink-0 pt-px">{l}</span>
            <span className="text-slate-800 font-medium">{v ?? "—"}</span>
          </div>
        ))}
        {booking.message && (
          <div className="flex gap-3 text-sm">
            <span className="text-slate-400 w-28 shrink-0 pt-px">Message</span>
            <span className="text-slate-600 italic">{booking.message}</span>
          </div>
        )}
      </div>

      {/* Editable fields */}
      <div className="space-y-4 mb-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Update booking</h4>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Booking status</label>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          >
            {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {editStatus === "cancelled" && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <span>⚠️</span> A cancellation email will be sent to the guest.
            </p>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Payment status</label>
          <select
            value={editPayment}
            onChange={(e) => setEditPayment(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          >
            {PAYMENT_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1.5">Admin notes</label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes for this booking…"
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none placeholder:text-slate-300"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ status: editStatus, payment_status: editPayment, admin_notes: editNotes })}
          disabled={saving}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-[#5A0E24] text-white hover:bg-[#7a1230] disabled:opacity-60 transition-colors shadow-sm"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
      {saveError && (
        <p className="text-xs text-red-500 mt-3 text-center">Failed to save changes. Please try again.</p>
      )}
    </>
  );
}
