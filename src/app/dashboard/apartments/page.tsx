"use client";

import { useState } from "react";
import { mockApartments, Apartment } from "@/lib/mockData";

type AptBooking = {
  id: string;
  checkIn: string;
  checkOut: string;
};
type AptBookings = Record<string, AptBooking[]>;

function initBookings(): AptBookings {
  return Object.fromEntries(mockApartments.map((a) => [a.id, []]));
}

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState<Apartment[]>(mockApartments);
  const [aptBookings, setAptBookings] = useState<AptBookings>(initBookings);

  // Edit modal
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editTotal, setEditTotal] = useState("");

  // Add booking form (inside modal)
  const [addingBooking, setAddingBooking] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState("");
  const [newCheckOut, setNewCheckOut] = useState("");

  // ---------- derived ----------

  function bookedCount(aptId: string) {
    return aptBookings[aptId]?.length ?? 0;
  }

  function availableCount(apt: Apartment) {
    return Math.max(0, apt.totalUnits - bookedCount(apt.id));
  }

  // ---------- bookings ----------

  function addBooking(aptId: string) {
    if (!newCheckIn || !newCheckOut) return;
    const booking: AptBooking = {
      id: `bk-${Date.now()}`,
      checkIn: newCheckIn,
      checkOut: newCheckOut,
    };
    setAptBookings((prev) => ({
      ...prev,
      [aptId]: [...(prev[aptId] ?? []), booking],
    }));
    setNewCheckIn("");
    setNewCheckOut("");
    setAddingBooking(false);
  }

  function removeBooking(aptId: string, bookingId: string) {
    setAptBookings((prev) => ({
      ...prev,
      [aptId]: (prev[aptId] ?? []).filter((b) => b.id !== bookingId),
    }));
  }

  // ---------- edit ----------

  function startEdit(apt: Apartment) {
    setEditing(apt);
    setEditPrice(String(apt.price));
    setEditTotal(String(apt.totalUnits));
    setAddingBooking(false);
    setNewCheckIn("");
    setNewCheckOut("");
  }

  function saveEdit() {
    if (!editing) return;
    const price = parseInt(editPrice);
    const total = parseInt(editTotal);
    if (!isNaN(price) && !isNaN(total)) {
      setApartments((prev) =>
        prev.map((a) =>
          a.id === editing.id
            ? { ...a, price, totalUnits: total, availableUnits: Math.max(0, total - bookedCount(a.id)) }
            : a
        )
      );
    }
    setEditing(null);
  }

  // ---------- render ----------

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Apartments</h1>
        <p className="text-slate-500 text-sm mt-1">Track unit availability per apartment type and manage pricing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {apartments.map((apt) => {
          const avail = availableCount(apt);
          const booked = bookedCount(apt.id);
          const availPct = apt.totalUnits > 0 ? (avail / apt.totalUnits) * 100 : 0;
          const statusColor = avail === 0 ? "bg-red-500" : avail < apt.totalUnits ? "bg-amber-500" : "bg-green-500";
          const bookings = aptBookings[apt.id] ?? [];

          return (
            <div key={apt.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{apt.name}</h3>
                  <span className="text-xs text-slate-400">{apt.type} · {apt.bedrooms} bed</span>
                </div>
                <span className="text-lg font-bold text-amber-700">
                  ₦{apt.price.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mo</span>
                </span>
              </div>

              {/* Availability bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Unit availability</span>
                  <span className="font-semibold text-slate-700">{avail}/{apt.totalUnits}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${statusColor}`} style={{ width: `${availPct}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1.5">
                  <span className="text-green-600 font-medium">{avail} Available</span>
                  <span className="text-red-500 font-medium">{booked} Booked</span>
                </div>
              </div>

              {/* Booked date badges on card */}
              {bookings.length > 0 && (
                <div className="space-y-1.5">
                  {bookings.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span className="text-xs text-red-600 font-semibold">Unit {i + 1}</span>
                      <span className="text-xs text-slate-500 flex-1">
                        {new Date(b.checkIn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {" → "}
                        {new Date(b.checkOut).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => startEdit(apt)}
                className="w-full py-2 text-sm font-semibold bg-[#5A0E24]/10 text-[#5A0E24] rounded-xl hover:bg-[#5A0E24]/20 transition-colors"
              >
                Edit &amp; Manage Bookings
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-slate-800">Edit — {editing.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{editing.type} · {editing.bedrooms} bedroom{editing.bedrooms !== 1 ? "s" : ""}</p>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Price per month (₦)</label>
              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            {/* Total units */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Total units</label>
              <input type="number" min="1" value={editTotal} onChange={(e) => setEditTotal(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            {/* ── Unit bookings section ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Bookings</label>
                <span className="text-xs text-slate-400">
                  {availableCount(editing)} of {editing.totalUnits} available
                </span>
              </div>

              {/* Existing bookings */}
              {(aptBookings[editing.id] ?? []).length === 0 && !addingBooking && (
                <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">No bookings recorded yet</p>
              )}

              <div className="space-y-2">
                {(aptBookings[editing.id] ?? []).map((b, i) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">Unit {i + 1}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(b.checkIn).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {" → "}
                        {new Date(b.checkOut).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <button
                      onClick={() => removeBooking(editing.id, b.id)}
                      className="px-2.5 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-200 shrink-0"
                    >
                      Release
                    </button>
                  </div>
                ))}
              </div>

              {/* Add booking form */}
              {addingBooking ? (
                <div className="mt-3 p-4 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/40 space-y-3">
                  <p className="text-xs font-semibold text-slate-600">New booking dates</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Check-in</label>
                      <input
                        type="date"
                        value={newCheckIn}
                        onChange={(e) => setNewCheckIn(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Check-out</label>
                      <input
                        type="date"
                        value={newCheckOut}
                        onChange={(e) => setNewCheckOut(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addBooking(editing.id)}
                      disabled={!newCheckIn || !newCheckOut || newCheckOut <= newCheckIn}
                      className="flex-1 py-2 bg-[#5A0E24] text-white text-xs font-semibold rounded-lg hover:bg-[#921224] disabled:opacity-40"
                    >
                      Confirm Booking
                    </button>
                    <button
                      onClick={() => { setAddingBooking(false); setNewCheckIn(""); setNewCheckOut(""); }}
                      className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                bookedCount(editing.id) < editing.totalUnits && (
                  <button
                    onClick={() => setAddingBooking(true)}
                    className="w-full mt-3 py-2.5 border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-400 rounded-xl hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Mark a unit as booked
                  </button>
                )
              )}

              {bookedCount(editing.id) >= editing.totalUnits && !addingBooking && (
                <p className="text-xs text-center text-red-500 font-medium mt-2">All units are booked</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224]">
                Save Changes
              </button>
              <button onClick={() => setEditing(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
