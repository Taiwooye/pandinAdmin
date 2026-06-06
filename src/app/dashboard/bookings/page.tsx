"use client";

import { useState, useMemo } from "react";
import { mockBookings, Booking } from "@/lib/mockData";

const serviceLabel: Record<string, string> = {
  hotel: "Hotel",
  apartment: "Apartment",
  "event-hall": "Event Hall",
  "lounge-bar": "Lounge & Bar",
  other: "General",
};

const serviceFilters = ["all", "hotel", "apartment", "event-hall", "other"] as const;
type ServiceFilter = (typeof serviceFilters)[number];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<(Booking & { verified: boolean })[]>(
    mockBookings.map((b) => ({ ...b, verified: b.status === "confirmed" }))
  );
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [selected, setSelected] = useState<(Booking & { verified: boolean }) | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? bookings : bookings.filter((b) => b.service === filter)),
    [bookings, filter]
  );

  function toggleVerified(id: string) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, verified: !b.verified } : b)));
    setSelected((s) => (s?.id === id ? { ...s, verified: !s.verified } : s));
  }

  const verifiedCount = bookings.filter((b) => b.verified).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Booking Log</h1>
        <p className="text-slate-500 text-sm mt-1">
          Track receipt confirmations sent to guests. Tick &ldquo;Payment Verified&rdquo; once you confirm the bank transfer.
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex gap-3 mb-6">
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm shadow-sm">
          <span className="text-slate-400">Total</span>
          <span className="ml-2 font-bold text-slate-800">{bookings.length}</span>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm shadow-sm">
          <span className="text-green-600">Payment Verified</span>
          <span className="ml-2 font-bold text-green-700">{verifiedCount}</span>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm shadow-sm">
          <span className="text-amber-600">Awaiting Verification</span>
          <span className="ml-2 font-bold text-amber-700">{bookings.length - verifiedCount}</span>
        </div>
      </div>

      {/* Service filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {serviceFilters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-[#5A0E24] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {f === "all" ? "All" : serviceLabel[f] ?? f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              {["Ref", "Guest", "Service", "Room / Venue", "Check-in", "Guests", "Payment"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3" />
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
                <td className="px-4 py-3 text-slate-600">{serviceLabel[b.service] ?? b.service}</td>
                <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">{b.room}</td>
                <td className="px-4 py-3 text-slate-600">{b.checkIn}</td>
                <td className="px-4 py-3 text-slate-600">{b.guests}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleVerified(b.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                      b.verified
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                    }`}
                  >
                    {b.verified ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Verified
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pending
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelected(b)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  No bookings found.
                </td>
              </tr>
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
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selected.verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {selected.verified ? "Payment Verified" : "Awaiting Payment"}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Guest", selected.name],
                ["Email", selected.email],
                ["Phone", selected.phone],
                ["Service", serviceLabel[selected.service] ?? selected.service],
                ["Room / Venue", selected.room],
                ["Check-in", selected.checkIn],
                ["Check-out", selected.checkOut],
                ["Guests", selected.guests],
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

            <div className="mt-5 pt-4 border-t border-slate-100 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
              <p className="font-semibold mb-0.5">Payment via bank transfer</p>
              <p className="text-amber-600">Verify on GTBank that the client sent payment with reference <strong>{selected.ref}</strong>, then mark as verified.</p>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => toggleVerified(selected.id)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  selected.verified
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {selected.verified ? "Unmark Verified" : "Mark as Payment Verified"}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
