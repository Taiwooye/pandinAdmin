"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useDashboard } from "@/hooks/queries/useDashboard";
import { useSiteStatsList } from "@/hooks/queries/useSiteStats";
import { useBookingList } from "@/hooks/queries/useBooking";
import EarningsChart from "@/components/EarningsChart";
import { PageHeader, Card, Badge, LoadingState, ErrorState, EmptyState, TextInput, errorMessage } from "@/components/ui";

// ─── Types (match the API: DashboardController + AdminBookingResource) ───────

type DashboardBooking = {
  id: number;
  booking_ref: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  service_type: { value: string; label: string };
  check_in_date: string | null;
  check_out_date: string | null;
  event_date: string | null;
  event_type: string | null;
  reservation_date: string | null;
  reservation_time: string | null;
  num_guests: number | null;
  status: { value: string; label: string };
  payment_status: { value: string; label: string };
  created_at: string;
};

type Overview = {
  stats: {
    total_bookings: number;
    payment_verified: number;
    rooms_free: number;
    rooms_total: number;
    apartments_free: number;
    apartments_total: number;
    estimated_revenue: number | string;
  };
  earnings: {
    period: string;
    total: number | string;
    average_per_month: number | string;
    peak: number | string;
    breakdown: { label: string; amount: number | string }[];
  } | null;
  occupancy: { booked: number; available: number; total: number; percentage: number };
  bookings_by_service: Record<string, number>;
  upcoming_checkins: DashboardBooking[];
  recent_bookings: DashboardBooking[];
};

/** AdminSiteStatResource returns { id, label, value, sort_order } */
type SiteStat = { id: number; label: string; value: string | number | null };

export type EarningsPeriod = "7days" | "30days" | "3months" | "12months";

// ─── Plain-language labels ────────────────────────────────────────────────────

const SERVICES: { value: string; label: string; icon: string }[] = [
  { value: "hotel", label: "Hotel rooms", icon: "🏨" },
  { value: "apartment", label: "Apartments", icon: "🏠" },
  { value: "event_hall", label: "Event halls", icon: "🎉" },
  { value: "lounge_bar", label: "Lounge & bar", icon: "🍸" },
  { value: "general", label: "General enquiries", icon: "💬" },
];

const SERVICE_NAME: Record<string, string> = {
  hotel: "Hotel room",
  apartment: "Apartment",
  event_hall: "Event hall",
  lounge_bar: "Lounge & bar",
  general: "General enquiry",
};

const serviceIcon = (value: string) => SERVICES.find((s) => s.value === value)?.icon ?? "📋";

type Tone = "amber" | "green" | "slate" | "red";

const STATUS_TEXT: Record<string, { label: string; tone: Tone }> = {
  awaiting: { label: "New – waiting for you", tone: "amber" },
  verified: { label: "Confirmed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "slate" },
};

const PAYMENT_TEXT: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Not paid yet", tone: "red" },
  verified: { label: "Paid", tone: "green" },
};

const QUICK_LINKS = [
  { label: "View bookings", hint: "See and confirm guest bookings", href: "/dashboard/bookings", icon: "📅" },
  { label: "Update room prices", hint: "Change prices and room details", href: "/dashboard/rooms", icon: "🛏️" },
  { label: "Add a new room", hint: "Put a new room type on the website", href: "/dashboard/rooms/new", icon: "➕" },
  { label: "Edit lounge menu", hint: "Drinks, food and prices", href: "/dashboard/lounge", icon: "🍸" },
  { label: "Add photos", hint: "Upload pictures to the website gallery", href: "/dashboard/gallery", icon: "📸" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function naira(value: number | string | null | undefined): string {
  return `₦${Number(value ?? 0).toLocaleString()}`;
}

/** "2026-10-30" → "Fri, 30 Oct 2026" (parsed as a local date, no timezone shift) */
function formatDate(date: string | null): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function whenText(b: DashboardBooking): string {
  if (b.check_in_date && b.check_out_date) return `${formatDate(b.check_in_date)} → ${formatDate(b.check_out_date)}`;
  if (b.check_in_date) return formatDate(b.check_in_date);
  if (b.event_date) return `${formatDate(b.event_date)}${b.event_type ? ` · ${b.event_type}` : ""}`;
  if (b.reservation_date) return `${formatDate(b.reservation_date)}${b.reservation_time ? ` at ${b.reservation_time.slice(0, 5)}` : ""}`;
  return "No date given";
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

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function siteStatsFromResponse(raw: unknown): SiteStat[] {
  const d = (raw as { data?: unknown })?.data ?? raw;
  return Array.isArray(d) ? (d as SiteStat[]) : [];
}

// Greeting and today's date depend on the viewer's clock, so they are only
// worked out in the browser (the server render shows a neutral fallback).
const noSubscribe = () => () => {};
function useClientText(get: () => string, fallback: string) {
  return useSyncExternalStore(noSubscribe, get, () => fallback);
}
function greetingNow() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function todayText() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [earningsPeriod, setEarningsPeriod] = useState<EarningsPeriod>("12months");
  const { data, isLoading, isError, error } = useDashboard({ period: earningsPeriod });
  const { data: siteStatsRaw, isLoading: siteStatsLoading } = useSiteStatsList();
  const awaiting = useBookingList({ status: "awaiting" });

  // Keep showing the last numbers while a new earnings period loads,
  // instead of blanking the whole page.
  const fresh = data?.data as Overview | undefined;
  const [lastOverview, setLastOverview] = useState<Overview | undefined>(undefined);
  if (fresh && fresh !== lastOverview) setLastOverview(fresh);
  const overview = fresh ?? lastOverview;

  const greeting = useClientText(greetingNow, "Welcome back");
  const today = useClientText(todayText, "");

  const recentBookings = useMemo(() => overview?.recent_bookings ?? [], [overview]);
  const upcomingCheckIns = overview?.upcoming_checkins ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return recentBookings;
    return recentBookings.filter(
      (b) =>
        b.guest_name?.toLowerCase().includes(q) ||
        b.guest_email?.toLowerCase().includes(q) ||
        b.guest_phone?.includes(q) ||
        b.booking_ref?.toLowerCase().includes(q) ||
        (STATUS_TEXT[b.status?.value]?.label ?? b.status?.label ?? "").toLowerCase().includes(q) ||
        (SERVICE_NAME[b.service_type?.value] ?? b.service_type?.label ?? "").toLowerCase().includes(q)
    );
  }, [search, recentBookings]);

  const siteStats = siteStatsFromResponse(siteStatsRaw);
  const awaitingCount: number | undefined = awaiting.data?.meta?.total;

  const header = (
    <PageHeader
      title={greeting}
      description={`${today ? `Today is ${today}. ` : ""}Here is what needs doing and how things are going at PaNDiN Group.`}
    />
  );

  if (isLoading && !overview) {
    return (
      <div className="max-w-6xl">
        {header}
        <LoadingState label="Loading your overview…" />
      </div>
    );
  }

  if (isError && !overview) {
    return (
      <div className="max-w-6xl space-y-6">
        {header}
        <ErrorState message={`Could not load the overview. ${errorMessage(error)}`} />
        <QuickLinks />
      </div>
    );
  }

  if (!overview) return null;

  const { stats, occupancy } = overview;
  const serviceCounts = SERVICES.map((s) => ({ ...s, count: overview.bookings_by_service?.[s.value] ?? 0 }));
  const serviceMax = Math.max(...serviceCounts.map((s) => s.count), 1);

  return (
    <div className="max-w-6xl space-y-6">
      {header}

      {/* ── Needs attention ─────────────────────────────────────────────── */}
      <NeedsAttention count={awaitingCount} loading={awaiting.isLoading} failed={awaiting.isError} arrivingSoon={upcomingCheckIns.length} />

      {/* ── Quick links ─────────────────────────────────────────────────── */}
      <QuickLinks />

      {/* ── Latest bookings + arriving soon ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h2 className="font-bold text-slate-800">Latest bookings</h2>
              <p className="text-sm text-slate-500">The 5 most recent bookings and enquiries from the website.</p>
            </div>
            <Link href="/dashboard/bookings" className="shrink-0 text-sm font-semibold text-[#5A0E24] hover:underline">
              See all →
            </Link>
          </div>

          {recentBookings.length > 0 && (
            <div className="relative my-4">
              <TextInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search these by guest name, phone or booking reference"
                className="pr-10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {recentBookings.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon="📭" title="No bookings yet" description="New bookings from the website will show up here." />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No recent booking matches &ldquo;{search}&rdquo;.{" "}
              <Link href="/dashboard/bookings" className="font-semibold text-[#5A0E24] hover:underline">
                Search all bookings
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((b) => (
                <RecentBookingRow key={b.id} booking={b} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2 p-5">
          <h2 className="font-bold text-slate-800">Arriving in the next 7 days</h2>
          <p className="text-sm text-slate-500 mb-4">Guests whose stay starts this week. Get their rooms ready.</p>
          {upcomingCheckIns.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <div className="text-3xl mb-2">🗓️</div>
              <p className="text-sm">Nobody is due to arrive in the next 7 days.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {upcomingCheckIns.map((b) => (
                <li key={b.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xl shrink-0">
                    {serviceIcon(b.service_type?.value)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{b.guest_name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {SERVICE_NAME[b.service_type?.value] ?? b.service_type?.label}
                      {b.num_guests ? ` · ${plural(b.num_guests, "guest")}` : ""}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-[#5A0E24] text-right shrink-0">{formatDate(b.check_in_date)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── At a glance ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-bold text-slate-800">At a glance</h2>
        <p className="text-sm text-slate-500 mb-3">Quick numbers for the whole business.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon="📋" label="All bookings" value={Number(stats.total_bookings ?? 0).toLocaleString()} hint="Every booking and enquiry received so far." />
          <StatCard icon="💳" label="Paid bookings" value={Number(stats.payment_verified ?? 0).toLocaleString()} hint="Bookings where payment has been checked and received." />
          <StatCard icon="🏨" label="Hotel rooms free" value={`${stats.rooms_free} of ${stats.rooms_total}`} hint="Rooms marked available right now." />
          <StatCard icon="🏠" label="Apartments free" value={`${stats.apartments_free} of ${stats.apartments_total}`} hint="Apartments marked available right now." />
          <StatCard
            icon="💰"
            label="Room money this month"
            value={naira(stats.estimated_revenue)}
            hint="Estimate from paid hotel room bookings checking in this month."
            highlight
          />
        </div>
      </section>

      {/* ── Earnings chart (only sent to staff allowed to see earnings) ─── */}
      {overview.earnings && (
        <section>
          <h2 className="font-bold text-slate-800">Money earned</h2>
          <p className="text-sm text-slate-500 mb-3">
            Estimated income from paid hotel room bookings (room price × nights), by the date the guest checks in. Pick a time
            range with the buttons.
          </p>
          <EarningsChart earnings={overview.earnings} period={earningsPeriod} onPeriodChange={setEarningsPeriod} />
        </section>
      )}

      {/* ── Occupancy + bookings by service ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OccupancyCard occupancy={occupancy} />

        <Card className="p-5">
          <h2 className="font-bold text-slate-800">What guests book</h2>
          <p className="text-sm text-slate-500 mb-5">How many bookings each service has had in total.</p>
          <div className="space-y-4">
            {serviceCounts.map(({ value, label, icon, count }) => (
              <div key={value}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-700">
                    {icon} {label}
                  </span>
                  <span className="font-bold text-slate-800">{plural(count, "booking")}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#5A0E24] transition-all duration-500" style={{ width: `${(count / serviceMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Website numbers ─────────────────────────────────────────────── */}
      {(siteStatsLoading || siteStats.length > 0) && (
        <Card className="p-5">
          <h2 className="font-bold text-slate-800">Numbers shown on the website</h2>
          <p className="text-sm text-slate-500 mb-4">These figures appear on the public website for visitors to see.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {siteStatsLoading
              ? [1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)
              : siteStats.map((s) => (
                  <div key={s.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-xl font-black text-[#5A0E24]">{s.value ?? "—"}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{s.label}</div>
                  </div>
                ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function NeedsAttention({ count, loading, failed, arrivingSoon }: { count?: number; loading: boolean; failed: boolean; arrivingSoon: number }) {
  const n = count ?? 0;
  const hasNew = n > 0;
  const arriving = arrivingSoon > 0 ? ` ${plural(arrivingSoon, "guest")} ${arrivingSoon === 1 ? "is" : "are"} arriving in the next 7 days.` : "";

  let title: string;
  let message = "";
  if (loading) {
    title = "Checking for new bookings…";
  } else if (failed || count === undefined) {
    title = "Could not check for new bookings";
    message = "Open the Bookings page to see them.";
  } else if (hasNew) {
    title = `${plural(n, "new booking")} waiting for you`;
    message = `Call the guest, check their payment, then confirm the booking.${arriving}`;
  } else {
    title = "You're all caught up!";
    message = `There are no new bookings waiting.${arriving}`;
  }

  return (
    <div
      className={`rounded-2xl border-2 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${
        hasNew ? "border-amber-300 bg-amber-50" : "border-green-200 bg-green-50"
      }`}
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${hasNew ? "bg-amber-500 text-white" : "bg-white text-3xl"}`}>
        {hasNew ? <span className="text-3xl font-black">{n}</span> : loading ? "⏳" : failed ? "⚠️" : "🎉"}
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Needs attention</p>
        <p className={`text-xl font-bold ${hasNew ? "text-amber-900" : "text-slate-800"}`}>{title}</p>
        {message && <p className="text-sm text-slate-600 mt-0.5">{message}</p>}
      </div>
      <Link
        href="/dashboard/bookings"
        className={`shrink-0 inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-5 py-3 text-sm transition-colors ${
          hasNew ? "bg-[#5A0E24] text-white hover:bg-[#7a1230]" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {hasNew ? "Go to new bookings →" : "View bookings"}
      </Link>
    </div>
  );
}

function QuickLinks() {
  return (
    <section>
      <h2 className="font-bold text-slate-800 mb-3">Common tasks</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group bg-white rounded-2xl border border-slate-200 p-4 hover:border-[#5A0E24] hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">{l.icon}</div>
            <p className="font-semibold text-slate-800 group-hover:text-[#5A0E24]">{l.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{l.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentBookingRow({ booking: b }: { booking: DashboardBooking }) {
  const status = STATUS_TEXT[b.status?.value] ?? { label: b.status?.label ?? "", tone: "slate" };
  const payment = PAYMENT_TEXT[b.payment_status?.value] ?? { label: b.payment_status?.label ?? "", tone: "slate" };
  return (
    <li>
      <Link href="/dashboard/bookings" className="flex items-start gap-3 py-3 -mx-2 px-2 rounded-xl hover:bg-slate-50">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0">{serviceIcon(b.service_type?.value)}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{b.guest_name}</p>
          <p className="text-xs text-slate-500 truncate">
            {SERVICE_NAME[b.service_type?.value] ?? b.service_type?.label} · {whenText(b)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {b.created_at && <>Booked {timeAgo(b.created_at)}</>}
            {b.booking_ref && <span className="font-mono"> · {b.booking_ref}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge tone={status.tone}>{status.label}</Badge>
          {b.status?.value !== "cancelled" && payment.label && <Badge tone={payment.tone}>{payment.label}</Badge>}
        </div>
      </Link>
    </li>
  );
}

function StatCard({ icon, label, value, hint, highlight }: { icon: string; label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "bg-[#5A0E24]/5 border-[#5A0E24]/15" : "bg-white border-slate-200"}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold leading-tight ${highlight ? "text-[#5A0E24]" : "text-slate-800"}`}>{value}</div>
      <div className="text-sm font-semibold text-slate-700 mt-1">{label}</div>
      <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
    </div>
  );
}

function OccupancyCard({ occupancy }: { occupancy: Overview["occupancy"] }) {
  const R = 40;
  const circ = 2 * Math.PI * R;
  const pct = occupancy?.percentage ?? 0;
  const filled = circ * (pct / 100);
  const booked = occupancy?.booked ?? 0;
  const total = occupancy?.total ?? 0;

  return (
    <Card className="p-5">
      <h2 className="font-bold text-slate-800">How full are we?</h2>
      <p className="text-sm text-slate-500 mb-4">Hotel rooms and apartments together, right now.</p>
      <div className="flex items-center gap-5 flex-wrap">
        <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" stroke="#F1F5F9" strokeWidth="14" />
          <circle cx="50" cy="50" r={R} fill="none" stroke="#5A0E24" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${filled} ${circ - filled}`} />
        </svg>
        <div>
          <div className="text-4xl font-black text-slate-800">{pct}%</div>
          <p className="text-sm text-slate-600 mt-1">
            {booked} of {total} {total === 1 ? "place is" : "places are"} booked.
          </p>
          <div className="flex gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#5A0E24]" />
              <span className="text-slate-500">Booked ({booked})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="text-slate-500">Free ({occupancy?.available ?? total - booked})</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
