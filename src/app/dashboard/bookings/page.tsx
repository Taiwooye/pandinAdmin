"use client";

import { useState } from "react";
import { mockBookings, Booking, BookingStatus } from "@/lib/mockData";

const statusBadge: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const serviceLabel: Record<string, string> = {
  hotel: "Hotel", apartment: "Apartment", "event-hall": "Event Hall", "lounge-bar": "Lounge & Bar",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [selected, setSelected] = useState<Booking | null>(null);

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  function updateStatus(id: string, status: BookingStatus) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    if (selected?.id === id) setSelected((s) => s ? { ...s, status } : s);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Bookings</h1>
        <p className="text-slate-500 text-sm mt-1">View and manage all incoming reservations.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "confirmed", "cancelled"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f ? "bg-[#C41230] text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              {["Ref", "Guest", "Service", "Room", "Check-in", "Guests", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{b.ref}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{b.name}</p>
                  <p className="text-xs text-slate-400">{b.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{serviceLabel[b.service] || b.service}</td>
                <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">{b.room}</td>
                <td className="px-4 py-3 text-slate-600">{b.checkIn}</td>
                <td className="px-4 py-3 text-slate-600">{b.guests}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[b.status]}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelected(b)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                      View
                    </button>
                    {b.status === "pending" && (
                      <button onClick={() => updateStatus(b.id, "confirmed")}
                        className="px-2.5 py-1 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                        Confirm
                      </button>
                    )}
                    {b.status !== "cancelled" && (
                      <button onClick={() => updateStatus(b.id, "cancelled")}
                        className="px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No bookings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800">Booking {selected.ref}</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[selected.status]}`}>
                {selected.status}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Guest", selected.name], ["Email", selected.email], ["Phone", selected.phone],
                ["Service", serviceLabel[selected.service] || selected.service],
                ["Room / Venue", selected.room], ["Check-in", selected.checkIn],
                ["Check-out", selected.checkOut], ["Guests", selected.guests],
              ].map(([l, v]) => (
                <div key={l} className="flex gap-3">
                  <span className="text-slate-400 w-28 shrink-0">{l}</span>
                  <span className="text-slate-800 font-medium">{v}</span>
                </div>
              ))}
              {selected.notes && (
                <div className="flex gap-3">
                  <span className="text-slate-400 w-28 shrink-0">Notes</span>
                  <span className="text-slate-600 italic">{selected.notes}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              {selected.status === "pending" && (
                <button onClick={() => updateStatus(selected.id, "confirmed")}
                  className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors">
                  Confirm
                </button>
              )}
              {selected.status !== "cancelled" && (
                <button onClick={() => updateStatus(selected.id, "cancelled")}
                  className="flex-1 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-100 transition-colors">
                  Cancel
                </button>
              )}
              <button onClick={() => setSelected(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
