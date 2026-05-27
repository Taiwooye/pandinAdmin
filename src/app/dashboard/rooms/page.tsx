"use client";

import { useState } from "react";
import { mockRooms, Room } from "@/lib/mockData";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [editing, setEditing] = useState<Room | null>(null);
  const [editPrice, setEditPrice] = useState("");

  function toggleAvailability(id: string) {
    setRooms((prev) => prev.map((r) => r.id === id ? { ...r, available: !r.available } : r));
  }

  function startEdit(room: Room) {
    setEditing(room);
    setEditPrice(String(room.price));
  }

  function savePrice() {
    if (!editing) return;
    const price = parseInt(editPrice);
    if (!isNaN(price) && price > 0) {
      setRooms((prev) => prev.map((r) => r.id === editing.id ? { ...r, price } : r));
    }
    setEditing(null);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Hotel Rooms</h1>
        <p className="text-slate-500 text-sm mt-1">Manage room pricing and availability.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => (
          <div key={room.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">{room.name}</h3>
                <span className="text-xs text-slate-400 uppercase tracking-wide">{room.category} · up to {room.capacity} guests</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${room.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {room.available ? "Available" : "Unavailable"}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl font-bold text-amber-700">₦{room.price.toLocaleString()}</span>
              <span className="text-slate-400 text-sm">/ night</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => startEdit(room)}
                className="flex-1 py-2 text-sm font-semibold bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors">
                Edit Price
              </button>
              <button onClick={() => toggleAvailability(room.id)}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${
                  room.available ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"
                }`}>
                {room.available ? "Mark Unavailable" : "Mark Available"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit price modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-4">Edit Price — {editing.name}</h3>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Price per night (₦)</label>
            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={savePrice} className="flex-1 py-2.5 bg-[#C41230] text-white font-semibold rounded-xl hover:bg-[#9C0E25] text-sm">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
