"use client";

import { useState } from "react";
import { mockApartments, Apartment } from "@/lib/mockData";

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState<Apartment[]>(mockApartments);
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [editPrice, setEditPrice] = useState("");

  function toggleAvailability(id: string) {
    setApartments((prev) => prev.map((a) => a.id === id ? { ...a, available: !a.available } : a));
  }

  function startEdit(apt: Apartment) {
    setEditing(apt);
    setEditPrice(String(apt.price));
  }

  function savePrice() {
    if (!editing) return;
    const price = parseInt(editPrice);
    if (!isNaN(price) && price > 0) {
      setApartments((prev) => prev.map((a) => a.id === editing.id ? { ...a, price } : a));
    }
    setEditing(null);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Apartments</h1>
        <p className="text-slate-500 text-sm mt-1">Manage apartment pricing and availability.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apartments.map((apt) => (
          <div key={apt.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{apt.name}</h3>
                <span className="text-xs text-slate-400">{apt.type} · {apt.bedrooms} bedroom{apt.bedrooms > 1 ? "s" : ""}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${apt.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {apt.available ? "Available" : "Unavailable"}
              </span>
            </div>
            <div className="mb-4">
              <span className="text-2xl font-bold text-amber-700">₦{apt.price.toLocaleString()}</span>
              <span className="text-slate-400 text-sm ml-1">/ month</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(apt)} className="flex-1 py-2 text-sm font-semibold bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-colors">Edit Price</button>
              <button onClick={() => toggleAvailability(apt.id)}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-colors ${apt.available ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                {apt.available ? "Unavailable" : "Available"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-4">Edit Price â€” {editing.name}</h3>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Price per month (₦)</label>
            <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4" />
            <div className="flex gap-2">
              <button onClick={savePrice} className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224]">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
