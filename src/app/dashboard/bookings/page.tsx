"use client";

import { useEffect, useMemo, useState } from "react";
import { useBooking, useBookingList, useUpdateBooking } from "@/hooks/queries/useBooking";
import { useRoomTypeList } from "@/hooks/queries/useRoomType";
import { useVenueList } from "@/hooks/queries/useVenue";
import { useBarList } from "@/hooks/queries/useBar";

type Booking = {
  id: number;
  booking_ref: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
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
  num_guests: number | null;
  message: string | null;
  status: { value: string; label: string };
  payment_status: { value: string; label: string };
  admin_notes: string | null;
  created_at: string;
};

type Named = { id: number; name?: string; title?: string };

// ─── Plain-language labels ────────────────────────────────────────────────────

const TABS = [
  { value: "awaiting", label: "Needs attention", hint: "New bookings waiting for you" },
  { value: "verified", label: "Confirmed", hint: "Bookings you have confirmed" },
  { value: "cancelled", label: "Cancelled", hint: "Cancelled bookings" },
  { value: "", label: "All", hint: "Every booking" },
];

const STATUS_TEXT: Record<string, { label: string; className: string }> = {
  awaiting: { label: "New – waiting for you", className: "bg-amber-100 text-amber-800" },
  verified: { label: "Confirmed", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", className: "bg-slate-200 text-slate-600" },
};

const PAYMENT_TEXT: Record<string, { label: string; className: string }> = {
  pending: { label: "Not paid yet", className: "bg-orange-50 text-orange-700 border border-orange-200" },
  verified: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};

const SERVICES = [
  { value: "", label: "All services" },
  { value: "hotel", label: "Hotel room", icon: "🏨" },
  { value: "apartment", label: "Apartment", icon: "🏠" },
  { value: "event_hall", label: "Event hall", icon: "🎉" },
  { value: "lounge_bar", label: "Lounge & bar", icon: "🍸" },
  { value: "general", label: "General enquiry", icon: "💬" },
];

const serviceIcon = (value: string) => SERVICES.find((s) => s.value === value)?.icon ?? "📋";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: string | null): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function nightsBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function whenText(b: Booking): string {
  if (b.check_in_date && b.check_out_date) {
    const n = nightsBetween(b.check_in_date, b.check_out_date);
    return `${formatDate(b.check_in_date)} → ${formatDate(b.check_out_date)} · ${n} night${n === 1 ? "" : "s"}`;
  }
  if (b.event_date) return `${formatDate(b.event_date)}${b.event_type ? ` · ${b.event_type}` : ""}`;
  if (b.reservation_date) return `${formatDate(b.reservation_date)}${b.reservation_time ? ` at ${b.reservation_time.slice(0, 5)}` : ""}`;
  return "";
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function phoneDigits(phone: string | null): string {
  return (phone ?? "").replace(/[^\d]/g, "");
}

function listFrom(raw: unknown): Named[] {
  const d = (raw as { data?: unknown })?.data ?? raw;
  return Array.isArray(d) ? (d as Named[]) : [];
}

function errorMessage(err: unknown): string {
  const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
  if (res?.status === 403) return "You don't have permission to do this. Ask a manager.";
  return res?.data?.message ?? "Something went wrong. Please try again.";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [tab, setTab] = useState("awaiting");
  const [service, setService] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Wait until typing pauses before searching
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page };
    if (tab) p.status = tab;
    if (service) p.service_type = service;
    if (search) {
      if (/^pnd-/i.test(search)) p.booking_ref = search;
      else p.guest_name = search;
    }
    return p;
  }, [page, tab, service, search]);

  const { data, isLoading, isError } = useBookingList(params);
  const bookings: Booking[] = data?.data ?? [];
  const meta = data?.meta;

  // Tab counts
  const awaitingCount = useBookingList({ status: "awaiting" }).data?.meta?.total;
  const verifiedCount = useBookingList({ status: "verified" }).data?.meta?.total;
  const cancelledCount = useBookingList({ status: "cancelled" }).data?.meta?.total;
  const allCount = useBookingList({}).data?.meta?.total;
  const counts: Record<string, number | undefined> = {
    awaiting: awaitingCount,
    verified: verifiedCount,
    cancelled: cancelledCount,
    "": allCount,
  };

  // Names for room types, venues and lounges (the bookings API only returns ids)
  const roomTypes = listFrom(useRoomTypeList().data);
  const venues = listFrom(useVenueList().data);
  const bars = listFrom(useBarList().data);
  const placeName = (b: Booking): string => {
    const find = (list: Named[], id: number | null) => {
      const item = id ? list.find((x) => x.id === id) : undefined;
      return item?.name ?? item?.title ?? "";
    };
    return find(roomTypes, b.room_type_id) || find(venues, b.venue_id) || find(bars, b.bar_venue_id);
  };

  const changeTab = (value: string) => {
    setTab(value);
    setPage(1);
  };

  const activeTab = TABS.find((t) => t.value === tab)!;

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Bookings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Bookings and enquiries from the website. Call the guest, check their payment, then confirm the booking.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {TABS.map((t) => {
          const active = tab === t.value;
          const urgent = t.value === "awaiting" && (counts.awaiting ?? 0) > 0;
          return (
            <button
              key={t.label}
              onClick={() => changeTab(t.value)}
              className={`text-left rounded-2xl border-2 px-4 py-3.5 transition-all ${
                active ? "border-[#5A0E24] bg-[#5A0E24] text-white shadow-md" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${active ? "text-white" : "text-slate-700"}`}>{t.label}</span>
                {urgent && !active && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />}
              </div>
              <div className={`text-3xl font-bold mt-1 ${active ? "text-white" : urgent ? "text-amber-600" : "text-slate-800"}`}>
                {counts[t.value] ?? "–"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + service */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search guest name or booking reference (e.g. PND-AB12)"
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/30 focus:border-[#5A0E24]"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={service}
          onChange={(e) => {
            setService(e.target.value);
            setPage(1);
          }}
          className="sm:w-56 px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/30 focus:border-[#5A0E24]"
        >
          {SERVICES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.icon ? `${s.icon}  ` : ""}{s.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400 text-sm">Loading bookings…</div>}
        {isError && (
          <div className="bg-red-50 rounded-2xl border border-red-200 py-10 text-center text-red-600 text-sm">
            Could not load bookings. Check your internet connection and refresh the page.
          </div>
        )}
        {!isLoading && !isError && bookings.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 text-center">
            <div className="text-4xl mb-3">{tab === "awaiting" ? "🎉" : "📭"}</div>
            <p className="font-semibold text-slate-700">
              {search || service ? "No bookings match your search." : tab === "awaiting" ? "You're all caught up!" : `No ${activeTab.label.toLowerCase()} bookings yet.`}
            </p>
            {tab === "awaiting" && !search && !service && (
              <p className="text-sm text-slate-500 mt-1">New bookings from the website will appear here.</p>
            )}
          </div>
        )}

        {!isLoading &&
          !isError &&
          bookings.map((b) => (
            <BookingCard key={b.id} booking={b} place={placeName(b)} onOpen={() => setSelectedId(b.id)} />
          ))}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-slate-500">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <div className="flex gap-2">
            <button
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50"
            >
              ← Previous
            </button>
            <button
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {selectedId && <BookingPanel id={selectedId} placeName={placeName} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ booking: b, place, onOpen }: { booking: Booking; place: string; onOpen: () => void }) {
  const status = STATUS_TEXT[b.status.value] ?? { label: b.status.label, className: "bg-slate-100 text-slate-600" };
  const payment = PAYMENT_TEXT[b.payment_status.value] ?? { label: b.payment_status.label, className: "bg-slate-100 text-slate-600" };
  const when = whenText(b);
  const isNew = b.status.value === "awaiting";

  return (
    <div
      onClick={onOpen}
      className={`group bg-white rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${
        isNew ? "border-amber-200 border-l-4 border-l-amber-500" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl shrink-0">{serviceIcon(b.service_type.value)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-800">{b.guest_name}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
            {b.service_type.value !== "general" && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${payment.className}`}>{payment.label}</span>
            )}
          </div>
          <p className="text-sm text-slate-700">
            <span className="font-medium">{b.service_type.label}</span>
            {place && <> · {place}</>}
            {b.num_guests ? <> · {b.num_guests} guest{b.num_guests === 1 ? "" : "s"}</> : null}
          </p>
          {when && <p className="text-sm text-slate-500 mt-0.5">📅 {when}</p>}
          <p className="text-xs text-slate-400 mt-1">
            Ref {b.booking_ref} · received {timeAgo(b.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {b.guest_phone && (
            <>
              <a href={`tel:${b.guest_phone}`} className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                📞 Call
              </a>
              <a
                href={`https://wa.me/${phoneDigits(b.guest_phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl border border-green-200 bg-green-50 text-sm font-medium text-green-700 hover:bg-green-100"
              >
                WhatsApp
              </a>
            </>
          )}
          <button onClick={onOpen} className="px-4 py-2 rounded-xl bg-[#5A0E24] text-white text-sm font-semibold hover:bg-[#7a1230]">
            {isNew ? "Review" : "Open"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Side panel ───────────────────────────────────────────────────────────────

function BookingPanel({ id, placeName, onClose }: { id: number; placeName: (b: Booking) => string; onClose: () => void }) {
  const { data, isLoading } = useBooking(String(id));
  const booking: Booking | undefined = data?.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {isLoading || !booking ? (
          <div className="py-24 text-center text-slate-400 text-sm">Loading booking…</div>
        ) : (
          <BookingPanelBody key={booking.id} booking={booking} place={placeName(booking)} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function BookingPanelBody({ booking: b, place, onClose }: { booking: Booking; place: string; onClose: () => void }) {
  const update = useUpdateBooking();
  const [notes, setNotes] = useState(b.admin_notes ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [done, setDone] = useState("");

  const isGeneral = b.service_type.value === "general";
  const isPaid = b.payment_status.value === "verified";
  const isConfirmed = b.status.value === "verified";
  const isCancelled = b.status.value === "cancelled";
  const status = STATUS_TEXT[b.status.value] ?? { label: b.status.label, className: "bg-slate-100 text-slate-600" };

  const save = (payload: Record<string, string>, message: string) => {
    setDone("");
    update.mutate(
      { id: String(b.id), payload },
      {
        onSuccess: () => {
          setDone(message);
          setConfirmCancel(false);
        },
      }
    );
  };

  const details: [string, string][] = [
    ["Service", b.service_type.label],
    ["Room / venue", place],
    ["Dates", whenText(b)],
    ["Guests", b.num_guests ? String(b.num_guests) : ""],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-slate-400 mb-1">
            Ref {b.booking_ref} · received {timeAgo(b.created_at)}
          </p>
          <h2 className="text-2xl font-bold text-slate-800">{b.guest_name}</h2>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xl leading-none">
          ✕
        </button>
      </div>

      {/* Contact */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Contact the guest</h3>
        <div className="grid grid-cols-3 gap-2">
          {b.guest_phone ? (
            <a href={`tel:${b.guest_phone}`} className="flex flex-col items-center gap-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700">
              <span className="text-xl">📞</span>Call
            </a>
          ) : (
            <span className="flex flex-col items-center gap-1 py-3 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">No phone</span>
          )}
          {b.guest_phone ? (
            <a
              href={`https://wa.me/${phoneDigits(b.guest_phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 py-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 text-sm font-medium text-green-700"
            >
              <span className="text-xl">💬</span>WhatsApp
            </a>
          ) : (
            <span />
          )}
          <a href={`mailto:${b.guest_email}`} className="flex flex-col items-center gap-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700">
            <span className="text-xl">✉️</span>Email
          </a>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {b.guest_phone && <>{b.guest_phone} · </>}
          {b.guest_email}
        </p>
      </section>

      {/* What they booked */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">What they asked for</h3>
        <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
          {details.map(([label, value]) => (
            <div key={label} className="flex gap-3 text-sm">
              <span className="w-28 shrink-0 text-slate-500">{label}</span>
              <span className="font-medium text-slate-800">{value}</span>
            </div>
          ))}
          {b.message && (
            <div className="pt-2 mt-2 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-1">Their message</p>
              <p className="text-sm text-slate-800 whitespace-pre-line">{b.message}</p>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">What to do next</h3>

        {isCancelled ? (
          <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
            This booking was cancelled.
            <button
              onClick={() => save({ status: "awaiting" }, "Booking moved back to “Needs attention”.")}
              disabled={update.isPending}
              className="block mt-3 px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Undo cancel
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {!isGeneral && (
              <Step
                number={1}
                done={isPaid}
                title={isPaid ? "Payment received" : "Has the guest paid?"}
                text={isPaid ? "You marked this booking as paid." : "Check your bank account for their transfer before marking it as paid."}
                action={
                  isPaid ? (
                    <button
                      onClick={() => save({ payment_status: "pending" }, "Marked as not paid.")}
                      disabled={update.isPending}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
                    >
                      Mark as not paid
                    </button>
                  ) : (
                    <button
                      onClick={() => save({ payment_status: "verified" }, "Marked as paid.")}
                      disabled={update.isPending}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      ✓ Mark as paid
                    </button>
                  )
                }
              />
            )}
            <Step
              number={isGeneral ? 1 : 2}
              done={isConfirmed}
              title={isConfirmed ? (isGeneral ? "Enquiry handled" : "Booking confirmed") : isGeneral ? "Reply to the guest" : "Confirm the booking"}
              text={
                isConfirmed
                  ? isGeneral
                    ? "You marked this enquiry as handled."
                    : "This booking is confirmed."
                  : isGeneral
                    ? "Call, WhatsApp or email them, then mark it as handled."
                    : "Once you've spoken to the guest and checked payment, confirm the booking."
              }
              action={
                !isConfirmed && (
                  <button
                    onClick={() => save({ status: "verified" }, isGeneral ? "Enquiry marked as handled." : "Booking confirmed.")}
                    disabled={update.isPending}
                    className="px-4 py-2.5 rounded-xl bg-[#5A0E24] text-white text-sm font-semibold hover:bg-[#7a1230] disabled:opacity-50"
                  >
                    {isGeneral ? "✓ Mark as handled" : "✓ Confirm booking"}
                  </button>
                )
              }
            />

            {!confirmCancel ? (
              <button onClick={() => setConfirmCancel(true)} className="text-sm font-semibold text-red-600 hover:text-red-700 pt-1">
                Cancel this booking…
              </button>
            ) : (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-800">Cancel this booking?</p>
                <p className="text-sm text-red-700 mt-1">The guest will receive an email saying their booking was cancelled.</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => save({ status: "cancelled" }, "Booking cancelled.")}
                    disabled={update.isPending}
                    className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    Yes, cancel it
                  </button>
                  <button onClick={() => setConfirmCancel(false)} className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700">
                    No, keep it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {update.isPending && <p className="text-sm text-slate-500 mt-3">Saving…</p>}
        {done && !update.isPending && <p className="text-sm font-medium text-green-700 mt-3">✓ {done}</p>}
        {update.isError && <p className="text-sm font-medium text-red-600 mt-3">{errorMessage(update.error)}</p>}
      </section>

      {/* Notes */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Staff notes (only staff can see these)</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Guest called, will pay on arrival"
          className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/30 focus:border-[#5A0E24] resize-none"
        />
        <button
          onClick={() => save({ admin_notes: notes }, "Notes saved.")}
          disabled={update.isPending || notes === (b.admin_notes ?? "")}
          className="mt-2 px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Save notes
        </button>
      </section>
    </div>
  );
}

function Step({
  number,
  done,
  title,
  text,
  action,
}: {
  number: number;
  done: boolean;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 flex gap-4 ${done ? "border-green-200 bg-green-50/60" : "border-slate-200"}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          done ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {done ? "✓" : number}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-500 mt-0.5">{text}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
