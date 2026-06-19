"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useDashboard } from "@/hooks/queries/useDashboard";
import { useSiteStatsList } from "@/hooks/queries/useSiteStats";
import EarningsChart from "@/components/EarningsChart";

type DashboardBooking = {
  id: number;
  booking_ref: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  service_type: { value: string; label: string };
  check_in_date: string | null;
  check_out_date: string | null;
  num_guests: number;
  status: { value: string; label: string };
  payment_status: { value: string; label: string };
};

const SERVICE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  apartment: "Apartment",
  event_hall: "Event Hall",
  lounge_bar: "Lounge & Bar",
  general: "General",
};

const statusBadge: Record<string, string> = {
  verified: "bg-green-100 text-green-700",
  awaiting: "bg-amber-100 text-amber-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function fmtNaira(value: number) {
  return `₦${value.toLocaleString()}`;
}

type SiteStat = {
  id: number;
  name?: string;
  stat_name?: string;
  label?: string;
  value?: number | string;
  stat_value?: number | string;
};

function siteStatLabel(s: SiteStat) { return s.name ?? s.stat_name ?? s.label ?? ""; }
function siteStatValue(s: SiteStat) { return s.value ?? s.stat_value ?? "—"; }

function siteStatsFromResponse(raw: unknown): SiteStat[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as SiteStat[];
  const wrapped = raw as { data?: unknown };
  if (Array.isArray(wrapped.data)) return wrapped.data as SiteStat[];
  return [];
}

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useDashboard();
  const { data: siteStatsRaw, isLoading: siteStatsLoading } = useSiteStatsList();
  const overview = data?.data;

  const recentBookings: DashboardBooking[] = overview?.recent_bookings ?? [];
  const upcomingCheckIns: DashboardBooking[] = overview?.upcoming_checkins ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return recentBookings;
    return recentBookings.filter((b) =>
      b.guest_name?.toLowerCase().includes(q) ||
      b.guest_email?.toLowerCase().includes(q) ||
      b.guest_phone?.includes(q) ||
      b.booking_ref?.toLowerCase().includes(q) ||
      b.status?.value?.includes(q) ||
      b.service_type?.label?.toLowerCase().includes(q)
    );
  }, [search, recentBookings]);

  const siteStats: SiteStat[] = siteStatsFromResponse(siteStatsRaw);

  const stats = overview?.stats;
  const occupancy = overview?.occupancy;
  const serviceCounts = Object.entries(SERVICE_LABELS).map(([key, label]) => ({
    label,
    count: overview?.bookings_by_service?.[key as keyof typeof SERVICE_LABELS] ?? 0,
  }));
  const serviceMax = Math.max(...serviceCounts.map((s) => s.count), 1);

  const statCards = stats
    ? [
        { label: "Total Bookings", value: stats.total_bookings, color: "bg-slate-50 text-slate-700 border-slate-100", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
        { label: "Payment Verified", value: stats.payment_verified, color: "bg-green-50 text-green-700 border-green-100", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
        { label: "Rooms Free", value: `${stats.rooms_free}/${stats.rooms_total}`, color: "bg-blue-50 text-blue-700 border-blue-100", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" },
        { label: "Apts Free", value: `${stats.apartments_free}/${stats.apartments_total}`, color: "bg-purple-50 text-purple-700 border-purple-100", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
      ]
    : [];

  // SVG donut math
  const R = 40;
  const circ = 2 * Math.PI * R;
  const occupancyPct = occupancy?.percentage ?? 0;
  const filled = circ * (occupancyPct / 100);

  if (isLoading) {
    return <div className="py-20 text-center text-slate-400">Loading dashboard…</div>;
  }

  if (isError || !overview) {
    return <div className="py-20 text-center text-red-500">Failed to load dashboard data.</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back. Here&apos;s what&apos;s happening at PaNDiN Group today.</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-8">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recent bookings by guest name, email, ref, status…"
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-slate-400"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {!search && (
        <>
          {/* Stats + revenue card */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
            {statCards.map((s) => (
              <div key={s.label} className={`rounded-2xl border p-4 sm:p-5 ${s.color}`}>
                <svg className="w-5 h-5 mb-3 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
                <div className="text-2xl sm:text-3xl font-bold">{s.value}</div>
                <div className="text-xs font-medium mt-1 opacity-70">{s.label}</div>
              </div>
            ))}
            <div className="col-span-2 sm:col-span-1 rounded-2xl border p-4 sm:p-5 bg-[#5A0E24]/5 text-[#5A0E24] border-[#5A0E24]/10">
              <svg className="w-5 h-5 mb-3 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xl font-bold leading-tight">{fmtNaira(Number(stats?.estimated_revenue ?? 0))}</div>
              <div className="text-xs font-medium mt-1 opacity-70">Est. Revenue</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {[
              { label: "Add Room", href: "/dashboard/rooms/new", icon: "M12 4v16m8-8H4", cls: "text-[#5A0E24] bg-[#5A0E24]/5 hover:bg-[#5A0E24]/10 border-[#5A0E24]/10" },
              { label: "Manage Rooms", href: "/dashboard/rooms", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5", cls: "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-100" },
              { label: "All Bookings", href: "/dashboard/bookings", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", cls: "text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-100" },
            ].map((a) => (
              <Link key={a.label} href={a.href} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${a.cls}`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
                </svg>
                {a.label}
              </Link>
            ))}
          </div>

          {/* Earnings bar chart */}
          {overview.earnings && <EarningsChart earnings={overview.earnings} />}

          {/* Occupancy donut + service split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Occupancy donut */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 text-sm">Occupancy</h3>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">Rooms &amp; apartments</p>
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0 -rotate-90">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="#F1F5F9" strokeWidth="14" />
                  <circle
                    cx="50" cy="50" r={R}
                    fill="none"
                    stroke="#5A0E24"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${circ - filled}`}
                  />
                </svg>
                <div>
                  <div className="text-4xl font-black text-slate-800">{occupancyPct}%</div>
                  <div className="text-xs text-slate-400 mt-0.5">{occupancy?.booked ?? 0} / {occupancy?.total ?? 0} units booked</div>
                  <div className="flex gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#5A0E24]" />
                      <span className="text-slate-500">Booked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      <span className="text-slate-500">Available</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 text-sm">Bookings by Service</h3>
              <p className="text-xs text-slate-400 mt-0.5 mb-5">Distribution across all services</p>
              <div className="space-y-4">
                {serviceCounts.map(({ label, count }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-600">{label}</span>
                      <span className="font-bold text-slate-800">{count} booking{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#5A0E24] transition-all duration-500"
                        style={{ width: `${(count / serviceMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Site stats */}
          {(siteStatsLoading || siteStats.length > 0) && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Site Statistics</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Public-facing metrics from <span className="font-mono">/api/v1/admin/stats</span></p>
                </div>
                <Link href="/dashboard/admins" className="text-xs text-[#5A0E24] font-semibold hover:underline">
                  Edit
                </Link>
              </div>
              {siteStatsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {siteStats.map((s) => (
                    <div key={s.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="text-xl font-black text-[#5A0E24]">{siteStatValue(s).toLocaleString()}</div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{siteStatLabel(s)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming check-ins */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
            <h3 className="font-semibold text-slate-800 text-sm">Upcoming Check-ins</h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">Next 7 days</p>
            {upcomingCheckIns.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">No check-ins in the next 7 days</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingCheckIns.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                      {b.guest_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{b.guest_name}</p>
                      <p className="text-xs text-slate-400 truncate">{b.service_type?.label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#5A0E24]">
                        {b.check_in_date && new Date(b.check_in_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                      <p className="text-xs text-slate-400">{b.num_guests} guest{b.num_guests !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Bookings list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            {search ? `Results for "${search}" (${filtered.length})` : "Recent Bookings"}
          </h2>
          {!search && (
            <Link href="/dashboard/bookings" className="text-xs text-[#5A0E24] font-semibold hover:underline flex items-center gap-1">
              View all
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          )}
        </div>

        <div className="divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              <p className="font-medium">No bookings match &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            filtered.map((b) => (
              <div key={b.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                  {b.guest_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{b.guest_name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {b.service_type?.label} · {b.check_in_date}
                    {b.booking_ref && <span className="ml-1 font-mono">· {b.booking_ref}</span>}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusBadge[b.status?.value] ?? "bg-slate-100 text-slate-500"}`}>
                  {b.status?.label}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
