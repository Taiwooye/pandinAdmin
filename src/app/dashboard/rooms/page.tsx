"use client";

import { useState } from "react";
import { mockRooms, Room } from "@/lib/mockData";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [editing, setEditing] = useState<Room | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editAvailable, setEditAvailable] = useState("");
  const [editTotal, setEditTotal] = useState("");

  function startEdit(room: Room) {
    setEditing(room);
    setEditPrice(String(room.price));
    setEditAvailable(String(room.availableUnits));
    setEditTotal(String(room.totalUnits));
  }

  function saveEdit() {
    if (!editing) return;
    const price = parseInt(editPrice);
    const available = parseInt(editAvailable);
    const total = parseInt(editTotal);
    if (!isNaN(price) && !isNaN(available) && !isNaN(total) && available <= total) {
      setRooms((prev) => prev.map((r) => r.id === editing.id ? { ...r, price, availableUnits: available, totalUnits: total } : r));
    }
    setEditing(null);
  }

  function adjustAvailable(id: string, delta: number) {
    setRooms((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const next = Math.max(0, Math.min(r.totalUnits, r.availableUnits + delta));
      return { ...r, availableUnits: next };
    }));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Hotel Rooms</h1>
        <p className="text-slate-500 text-sm mt-1">Track unit availability per room type and manage pricing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rooms.map((room) => {
          const bookedUnits = room.totalUnits - room.availableUnits;
          const availPct = room.totalUnits > 0 ? (room.availableUnits / room.totalUnits) * 100 : 0;
          const statusColor = room.availableUnits === 0 ? "bg-red-500" : room.availableUnits < room.totalUnits / 2 ? "bg-amber-500" : "bg-green-500";

          return (
            <div key={room.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">{room.name}</h3>
                  <span className="text-xs text-slate-400 uppercase tracking-wide">{room.category} · max {room.capacity} guests</span>
                </div>
                <span className="text-2xl font-bold text-amber-700">₦{room.price.toLocaleString()}<span className="text-xs font-normal text-slate-400">/night</span></span>
              </div>

              {/* Availability bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Unit availability</span>
                  <span className="font-semibold text-slate-700">{room.availableUnits} of {room.totalUnits} available</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${statusColor}`} style={{ width: `${availPct}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1.5">
                  <span className="text-green-600 font-medium">{room.availableUnits} Available</span>
                  <span className="text-red-500 font-medium">{bookedUnits} Booked</span>
                </div>
              </div>

              {/* Quick adjust */}
              <div className="flex items-center gap-3 mb-4 bg-slate-50 rounded-xl p-3">
                <span className="text-xs text-slate-500 font-medium flex-1">Quick adjust available units</span>
                <button onClick={() => adjustAvailable(room.id, -1)} disabled={room.availableUnits === 0}
                  className="w-8 h-8 rounded-lg bg-red-100 text-red-600 font-bold text-lg hover:bg-red-200 disabled:opacity-30 transition-colors">−</button>
                <span className="w-8 text-center font-bold text-slate-800">{room.availableUnits}</span>
                <button onClick={() => adjustAvailable(room.id, 1)} disabled={room.availableUnits === room.totalUnits}
                  className="w-8 h-8 rounded-lg bg-green-100 text-green-700 font-bold text-lg hover:bg-green-200 disabled:opacity-30 transition-colors">+</button>
              </div>

              <button onClick={() => startEdit(room)}
                className="w-full py-2 text-sm font-semibold bg-[#5A0E24]/10 text-[#5A0E24] rounded-xl hover:bg-[#5A0E24]/20 transition-colors">
                Edit Price & Unit Count
              </button>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800">Edit — {editing.name}</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Price per night (₦)</label>
              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Total units</label>
                <input type="number" min="1" value={editTotal} onChange={(e) => setEditTotal(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Available units</label>
                <input type="number" min="0" max={editTotal} value={editAvailable} onChange={(e) => setEditAvailable(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            {parseInt(editAvailable) > parseInt(editTotal) && (
              <p className="text-red-500 text-xs">Available units cannot exceed total units.</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={parseInt(editAvailable) > parseInt(editTotal)}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-50">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
