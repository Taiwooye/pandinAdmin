"use client";

import { useState, useMemo } from "react";
import { mockRooms, Room } from "@/lib/mockData";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Room | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editAvailable, setEditAvailable] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editRoomNumbers, setEditRoomNumbers] = useState("");
  const [editFacilities, setEditFacilities] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rooms;
    return rooms.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.roomTypeDesc.toLowerCase().includes(q) ||
      r.roomNumbers.some((n) => n.toLowerCase().includes(q)) ||
      r.facilities.some((f) => f.toLowerCase().includes(q))
    );
  }, [rooms, search]);

  const totalRooms = rooms.reduce((s, r) => s + r.totalUnits, 0);
  const totalAvailable = rooms.reduce((s, r) => s + r.availableUnits, 0);
  const totalBooked = totalRooms - totalAvailable;

  function startEdit(room: Room) {
    setEditing(room);
    setEditPrice(String(room.price));
    setEditAvailable(String(room.availableUnits));
    setEditTotal(String(room.totalUnits));
    setEditRoomNumbers(room.roomNumbers.join(", "));
    setEditFacilities(room.facilities.join(", "));
  }

  function saveEdit() {
    if (!editing) return;
    const price = parseInt(editPrice);
    const available = parseInt(editAvailable);
    const total = parseInt(editTotal);
    const roomNumbers = editRoomNumbers.split(",").map((s) => s.trim()).filter(Boolean);
    const facilities = editFacilities.split(",").map((s) => s.trim()).filter(Boolean);
    if (!isNaN(price) && !isNaN(available) && !isNaN(total) && available <= total) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === editing.id ? { ...r, price, availableUnits: available, totalUnits: total, roomNumbers, facilities } : r
        )
      );
    }
    setEditing(null);
  }

  function adjustAvailable(id: string, delta: number) {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, availableUnits: Math.max(0, Math.min(r.totalUnits, r.availableUnits + delta)) };
      })
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hotel Rooms</h1>
          <p className="text-slate-500 text-sm mt-1">Manage rates, availability, room numbers, and facilities.</p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, room no., facility…"
            className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-72"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{totalRooms}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Rooms</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
          <div className="text-xs text-slate-500 mt-0.5">Available</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{totalBooked}</div>
          <div className="text-xs text-slate-500 mt-0.5">Booked</div>
        </div>
      </div>

      {/* Room cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-medium">No rooms match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((room) => {
            const bookedUnits = room.totalUnits - room.availableUnits;
            const availPct = room.totalUnits > 0 ? (room.availableUnits / room.totalUnits) * 100 : 0;
            const barColor =
              room.availableUnits === 0 ? "bg-red-500"
              : room.availableUnits < room.totalUnits / 2 ? "bg-amber-500"
              : "bg-green-500";

            return (
              <div key={room.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                {/* Name + price */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-wide">{room.name}</h3>
                    <span className="inline-block mt-1 text-xs font-semibold text-[#5A0E24] bg-[#5A0E24]/10 px-2.5 py-0.5 rounded-full">
                      {room.category}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-xl font-bold text-amber-700">₦{room.price.toLocaleString()}</div>
                    <div className="text-xs text-slate-400">per night</div>
                  </div>
                </div>

                {/* Type desc */}
                <p className="text-sm text-slate-500 -mt-2">
                  {room.roomTypeDesc} &nbsp;·&nbsp; max {room.capacity} guest{room.capacity > 1 ? "s" : ""}
                </p>

                {/* Availability bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Availability</span>
                    <span className="font-semibold text-slate-700">{room.availableUnits} / {room.totalUnits} units</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${availPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-green-600 font-medium">{room.availableUnits} Available</span>
                    <span className="text-red-500 font-medium">{bookedUnits} Booked</span>
                  </div>
                </div>

                {/* Room numbers */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room Numbers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.roomNumbers.map((n) => (
                      <span key={n} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-mono font-semibold rounded">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Facilities */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Facilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.facilities.map((f) => (
                      <span key={f} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick adjust */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <span className="text-xs text-slate-500 font-medium flex-1">Quick adjust available</span>
                  <button onClick={() => adjustAvailable(room.id, -1)} disabled={room.availableUnits === 0}
                    className="w-8 h-8 rounded-lg bg-red-100 text-red-600 font-bold text-lg hover:bg-red-200 disabled:opacity-30 transition-colors">
                    −
                  </button>
                  <span className="w-8 text-center font-bold text-slate-800">{room.availableUnits}</span>
                  <button onClick={() => adjustAvailable(room.id, 1)} disabled={room.availableUnits === room.totalUnits}
                    className="w-8 h-8 rounded-lg bg-green-100 text-green-700 font-bold text-lg hover:bg-green-200 disabled:opacity-30 transition-colors">
                    +
                  </button>
                </div>

                <button onClick={() => startEdit(room)}
                  className="w-full py-2 text-sm font-semibold bg-[#5A0E24]/10 text-[#5A0E24] rounded-xl hover:bg-[#5A0E24]/20 transition-colors">
                  Edit Details
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-slate-800 text-lg uppercase">{editing.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{editing.category} — Edit details</p>
            </div>

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
                <input type="number" min="0" value={editAvailable} onChange={(e) => setEditAvailable(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            {parseInt(editAvailable) > parseInt(editTotal) && (
              <p className="text-red-500 text-xs">Available cannot exceed total.</p>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Room Numbers <span className="normal-case font-normal text-slate-400">(comma-separated)</span>
              </label>
              <input value={editRoomNumbers} onChange={(e) => setEditRoomNumbers(e.target.value)}
                placeholder="e.g. 101, 102, 203"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Facilities <span className="normal-case font-normal text-slate-400">(comma-separated)</span>
              </label>
              <textarea value={editFacilities} onChange={(e) => setEditFacilities(e.target.value)}
                rows={3} placeholder="e.g. 24/7 AC, Smart TV, Fridge"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={parseInt(editAvailable) > parseInt(editTotal)}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-50">
                Save Changes
              </button>
              <button onClick={() => setEditing(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
