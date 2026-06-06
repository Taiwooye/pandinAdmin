"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { mockBookings, mockRooms, mockApartments } from "@/lib/mockData";
import EarningsChart from "@/components/EarningsChart";

// ── Derived stats ─────────────────────────────────────────────────────────────

const totalBookings = mockBookings.length;
const verifiedBookings = mockBookings.filter((b) => b.status === "confirmed").length;
const availableRooms = mockRooms.filter((r) => r.availableUnits > 0).length;
const availableApts = mockApartments.filter((a) => a.availableUnits > 0).length;

// Revenue estimate from confirmed bookings
function nightsBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
const ROOM_PRICES = Object.fromEntries(mockRooms.map((r) => [r.name.toLowerCase(), r.price]));
const APT_PRICES = Object.fromEntries(mockApartments.map((a) => [a.name.toLowerCase(), a.price]));

const estimatedRevenue = mockBookings
  .filter((b) => b.status === "confirmed")
  .reduce((sum, b) => {
    const key = b.room.toLowerCase();
    const price =
      Object.entries(ROOM_PRICES).find(([k]) => key.includes(k))?.[1] ??
      Object.entries(APT_PRICES).find(([k]) => key.includes(k))?.[1] ?? 0;
    return sum + price * nightsBetween(b.checkIn, b.checkOut);
  }, 0);

// Occupancy (rooms + apartments combined)
const totalUnits =
  mockRooms.reduce((s, r) => s + r.totalUnits, 0) +
  mockApartments.reduce((s, a) => s + a.totalUnits, 0);
const bookedUnits =
  mockRooms.reduce((s, r) => s + (r.totalUnits - r.availableUnits), 0) +
  mockApartments.reduce((s, a) => s + (a.totalUnits - a.availableUnits), 0);
const occupancyPct = totalUnits > 0 ? Math.round((bookedUnits / totalUnits) * 100) : 0;

// Bookings by service
const SERVICE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  apartment: "Apartment",
  "event-hall": "Event Hall",
  "lounge-bar": "Lounge & Bar",
};
const serviceCounts = Object.entries(SERVICE_LABELS).map(([key, label]) => ({
  label,
  count: mockBookings.filter((b) => b.service === key).length,
}));
const serviceMax = Math.max(...serviceCounts.map((s) => s.count), 1);

// Upcoming check-ins — next 7 days from today
const TODAY = new Date("2026-06-06");
const IN_7 = new Date(TODAY);
IN_7.setDate(IN_7.getDate() + 7);
const upcomingCheckIns = mockBookings
  .filter((b) => {
    const d = new Date(b.checkIn);
    return d >= TODAY && d <= IN_7 && b.status !== "cancelled";
  })
  .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());

// Stats cards
const stats = [
  { label: "Total Bookings", value: totalBookings, color: "bg-slate-50 text-slate-700 border-slate-100", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { label: "Payment Verified", value: verifiedBookings, color: "bg-green-50 text-green-700 border-green-100", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Rooms Free", value: `${availableRooms}/${mockRooms.length}`, color: "bg-blue-50 text-blue-700 border-blue-100", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" },
  { label: "Apts Free", value: `${availableApts}/${mockApartments.length}`, color: "bg-purple-50 text-purple-700 border-purple-100", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
];

const paymentBadge: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-slate-100 text-slate-500",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return mockBookings;
    return mockBookings.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      b.phone.includes(q) ||
      b.room.toLowerCase().includes(q) ||
      b.ref.toLowerCase().includes(q) ||
      b.checkIn.includes(q) ||
      b.checkOut.includes(q) ||
      b.status.includes(q) ||
      (SERVICE_LABELS[b.service] || b.service).toLowerCase().includes(q) ||
      b.guests.includes(q)
    );
  }, [search]);

  // SVG donut math
  const R = 40;
  const circ = 2 * Math.PI * R;
  const filled = circ * (occupancyPct / 100);

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
          placeholder="Search bookings by guest name, date, room, ref, status…"
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-2xl border p-5 ${s.color}`}>
                <svg className="w-5 h-5 mb-3 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
                <div className="text-3xl font-bold">{s.value}</div>
                <div className="text-xs font-medium mt-1 opacity-70">{s.label}</div>
              </div>
            ))}
            <div className="rounded-2xl border p-5 bg-[#5A0E24]/5 text-[#5A0E24] border-[#5A0E24]/10">
              <svg className="w-5 h-5 mb-3 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xl font-bold leading-tight">₦{estimatedRevenue.toLocaleString()}</div>
              <div className="text-xs font-medium mt-1 opacity-70">Est. Revenue</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3 mb-5">
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
          <EarningsChart />

          {/* Occupancy donut + service split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Occupancy donut */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-800 text-sm">Occupancy</h3>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">Rooms &amp; apartments</p>
              <div className="flex items-center gap-6">
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
                  <div className="text-xs text-slate-400 mt-0.5">{bookedUnits} / {totalUnits} units booked</div>
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
                      {b.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{b.name}</p>
                      <p className="text-xs text-slate-400 truncate">{b.room}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#5A0E24]">
                        {new Date(b.checkIn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                      <p className="text-xs text-slate-400">{b.guests} guest{parseInt(b.guests) !== 1 ? "s" : ""}</p>
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
            (search ? filtered : filtered.slice(0, 5)).map((b) => (
              <div key={b.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                  {b.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{b.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {b.room} · {b.checkIn}
                    {b.ref && <span className="ml-1 font-mono">· {b.ref}</span>}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${paymentBadge[b.status]}`}>
                  {b.status === "confirmed" ? "Verified" : b.status === "cancelled" ? "Cancelled" : "Awaiting"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
