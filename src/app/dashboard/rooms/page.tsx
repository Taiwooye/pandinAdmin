"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { mockRooms, Room } from "@/lib/mockData";

// Per room-number booking status
type RoomNumberStatus = {
  booked: boolean;
  checkIn: string;
  checkOut: string;
};
// roomStatuses[roomId][roomNumber] = RoomNumberStatus
type RoomStatuses = Record<string, Record<string, RoomNumberStatus>>;

function initStatuses(rooms: Room[]): RoomStatuses {
  return Object.fromEntries(
    rooms.map((r) => [
      r.id,
      Object.fromEntries(
        r.roomNumbers.map((n) => [n, { booked: false, checkIn: "", checkOut: "" }])
      ),
    ])
  );
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [statuses, setStatuses] = useState<RoomStatuses>(() => initStatuses(mockRooms));
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Room | null>(null);

  // Edit modal fields
  const [editPrice, setEditPrice] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editRoomNumbers, setEditRoomNumbers] = useState("");
  const [editFacilities, setEditFacilities] = useState("");

  // ---------- derived ----------

  function availableForRoom(room: Room): number {
    const s = statuses[room.id] ?? {};
    return room.roomNumbers.filter((n) => !s[n]?.booked).length;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.roomTypeDesc.toLowerCase().includes(q) ||
        r.roomNumbers.some((n) => n.toLowerCase().includes(q)) ||
        r.facilities.some((f) => f.toLowerCase().includes(q)) ||
        String(r.price).includes(q.replace(/[₦,\s]/g, ""))
    );
  }, [rooms, search]);

  const totalRooms = rooms.reduce((s, r) => s + r.totalUnits, 0);
  const totalAvailable = rooms.reduce((s, r) => s + availableForRoom(r), 0);

  // ---------- toggle room-number status ----------

  function toggleBooked(roomId: string, num: string) {
    setStatuses((prev) => {
      const roomS = { ...(prev[roomId] ?? {}) };
      const cur = roomS[num] ?? { booked: false, checkIn: "", checkOut: "" };
      roomS[num] = { ...cur, booked: !cur.booked };
      return { ...prev, [roomId]: roomS };
    });
  }

  function setBookingDate(roomId: string, num: string, field: "checkIn" | "checkOut", val: string) {
    setStatuses((prev) => {
      const roomS = { ...(prev[roomId] ?? {}) };
      roomS[num] = { ...(roomS[num] ?? { booked: true, checkIn: "", checkOut: "" }), [field]: val };
      return { ...prev, [roomId]: roomS };
    });
  }

  // ---------- edit modal ----------

  function startEdit(room: Room) {
    setEditing(room);
    setEditPrice(String(room.price));
    setEditTotal(String(room.totalUnits));
    setEditRoomNumbers(room.roomNumbers.join(", "));
    setEditFacilities(room.facilities.join(", "));
  }

  function saveEdit() {
    if (!editing) return;
    const price = parseInt(editPrice);
    const total = parseInt(editTotal);
    const roomNumbers = editRoomNumbers.split(",").map((s) => s.trim()).filter(Boolean);
    const facilities = editFacilities.split(",").map((s) => s.trim()).filter(Boolean);
    if (!isNaN(price) && !isNaN(total)) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === editing.id
            ? { ...r, price, totalUnits: total, roomNumbers, facilities, availableUnits: availableForRoom({ ...r, roomNumbers }) }
            : r
        )
      );
      // Sync statuses for any new room numbers
      setStatuses((prev) => {
        const existing = prev[editing.id] ?? {};
        const updated: Record<string, RoomNumberStatus> = {};
        for (const n of roomNumbers) {
          updated[n] = existing[n] ?? { booked: false, checkIn: "", checkOut: "" };
        }
        return { ...prev, [editing.id]: updated };
      });
    }
    setEditing(null);
  }

  // ---------- render ----------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hotel Rooms</h1>
          <p className="text-slate-500 text-sm mt-1">Manage rates, availability, room numbers, and facilities.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/rooms/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Room
          </Link>
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
          <div className="text-2xl font-bold text-red-500">{totalRooms - totalAvailable}</div>
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
            const avail = availableForRoom(room);
            const booked = room.roomNumbers.length - avail;
            const availPct = room.roomNumbers.length > 0 ? (avail / room.roomNumbers.length) * 100 : 0;
            const barColor = avail === 0 ? "bg-red-500" : avail < room.roomNumbers.length / 2 ? "bg-amber-500" : "bg-green-500";
            const roomS = statuses[room.id] ?? {};

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

                <p className="text-sm text-slate-500 -mt-2">
                  {room.roomTypeDesc} &nbsp;·&nbsp; max {room.capacity} guest{room.capacity > 1 ? "s" : ""}
                </p>

                {/* Availability bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Availability</span>
                    <span className="font-semibold text-slate-700">{avail} / {room.roomNumbers.length} rooms</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${availPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-green-600 font-medium">{avail} Available</span>
                    <span className="text-red-500 font-medium">{booked} Booked</span>
                  </div>
                </div>

                {/* Room number chips — colour-coded by status */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room Numbers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.roomNumbers.map((n) => {
                      const isBooked = roomS[n]?.booked;
                      return (
                        <button
                          key={n}
                          onClick={() => toggleBooked(room.id, n)}
                          title={isBooked ? "Click to mark available" : "Click to mark booked"}
                          className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border-2 transition-all ${
                            isBooked
                              ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                              : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">Tap a room number to toggle availability</p>
                </div>

                {/* Facilities */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Facilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {room.facilities.map((f) => (
                      <span key={f} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded font-medium">{f}</span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => startEdit(room)}
                  className="w-full py-2 text-sm font-semibold bg-[#5A0E24]/10 text-[#5A0E24] rounded-xl hover:bg-[#5A0E24]/20 transition-colors"
                >
                  Edit Details &amp; Booking Dates
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-slate-800 text-lg uppercase">{editing.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{editing.category} — Edit details &amp; booking dates</p>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Price per night (₦)</label>
              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            {/* Total units */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Total units</label>
              <input type="number" min="1" value={editTotal} onChange={(e) => setEditTotal(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            {/* Room numbers */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Room Numbers <span className="normal-case font-normal text-slate-400">(comma-separated)</span>
              </label>
              <input value={editRoomNumbers} onChange={(e) => setEditRoomNumbers(e.target.value)}
                placeholder="e.g. 101, 102, 203"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            {/* Facilities */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Facilities <span className="normal-case font-normal text-slate-400">(comma-separated)</span>
              </label>
              <textarea value={editFacilities} onChange={(e) => setEditFacilities(e.target.value)}
                rows={2} placeholder="e.g. 24/7 AC, Smart TV, Fridge"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            </div>

            {/* ── Room availability section ── */}
            <div>
              {/* liveNums = what's currently typed in the Room Numbers field */}
              {(() => {
                const liveNums = editRoomNumbers.split(",").map((s) => s.trim()).filter(Boolean);
                const liveAvail = liveNums.filter((n) => !statuses[editing.id]?.[n]?.booked).length;
                return (
              <>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Room Availability</label>
                <span className="text-xs text-slate-400">
                  {liveAvail} of {liveNums.length} available
                </span>
              </div>

              <div className="space-y-2">
                {liveNums.map((n) => {
                  const s = statuses[editing.id]?.[n] ?? { booked: false, checkIn: "", checkOut: "" };
                  return (
                    <div
                      key={n}
                      className={`rounded-xl border-2 p-3 transition-all ${
                        s.booked ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-700 text-sm">Room {n}</span>
                        <button
                          type="button"
                          onClick={() => toggleBooked(editing.id, n)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            s.booked
                              ? "bg-red-100 text-red-600 hover:bg-red-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${s.booked ? "bg-red-500" : "bg-green-500"}`} />
                          {s.booked ? "Booked — click to release" : "Available — click to book"}
                        </button>
                      </div>

                      {/* Date range shown only when booked */}
                      {s.booked && (
                        <div className="flex items-center gap-2 mt-2.5">
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-400 mb-1">Check-in</p>
                            <input
                              type="date"
                              value={s.checkIn}
                              onChange={(e) => setBookingDate(editing.id, n, "checkIn", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-red-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                            />
                          </div>
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-[10px] text-slate-400 mb-1">Check-out</p>
                            <input
                              type="date"
                              value={s.checkOut}
                              onChange={(e) => setBookingDate(editing.id, n, "checkOut", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-red-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </>
                );
              })()}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224]">
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
