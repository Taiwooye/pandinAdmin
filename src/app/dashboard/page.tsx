"use client";

import { useState, useMemo } from "react";
import { mockBookings, mockRooms, mockApartments } from "@/lib/mockData";

const pendingBookings = mockBookings.filter((b) => b.status === "pending");
const confirmedBookings = mockBookings.filter((b) => b.status === "confirmed");
const availableRooms = mockRooms.filter((r) => r.availableUnits > 0).length;
const availableApts = mockApartments.filter((a) => a.availableUnits > 0).length;

const stats = [
  { label: "Pending Bookings", value: pendingBookings.length, color: "bg-amber-50 text-amber-700 border-amber-100", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Confirmed Bookings", value: confirmedBookings.length, color: "bg-green-50 text-green-700 border-green-100", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Rooms Available", value: `${availableRooms}/${mockRooms.length}`, color: "bg-blue-50 text-blue-700 border-blue-100", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" },
  { label: "Apartments Available", value: `${availableApts}/${mockApartments.length}`, color: "bg-purple-50 text-purple-700 border-purple-100", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
];

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const serviceLabel: Record<string, string> = {
  hotel: "Hotel", apartment: "Apartment", "event-hall": "Event Hall", "lounge-bar": "Lounge & Bar",
};

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
      (serviceLabel[b.service] || b.service).toLowerCase().includes(q) ||
      b.guests.includes(q)
    );
  }, [search]);

  return (
    <div>
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
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats (hidden while searching) */}
      {!search && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-2xl border p-5 ${s.color}`}>
              <svg className="w-5 h-5 mb-3 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
              </svg>
              <div className="text-3xl font-bold">{s.value}</div>
              <div className="text-xs font-medium mt-1 opacity-70">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bookings list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            {search ? `Results for "${search}" (${filtered.length})` : "Recent Bookings"}
          </h2>
          {!search && (
            <a href="/dashboard/bookings" className="text-xs text-[#5A0E24] font-semibold hover:underline flex items-center gap-1">
              View all
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
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
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ${statusBadge[b.status]}`}>
                  {b.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
