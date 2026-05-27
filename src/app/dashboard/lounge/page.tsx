"use client";

import { useState } from "react";
import { mockLoungeMenu, MenuItem } from "@/lib/mockData";

export default function LoungePage() {
  const [menu, setMenu] = useState<MenuItem[]>(mockLoungeMenu);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const categories = [...new Set(menu.map((m) => m.category))];

  function startEdit(item: MenuItem) {
    setEditing(item);
    setEditPrice(String(item.price));
    setEditName(item.name);
    setEditDesc(item.description);
  }

  function saveEdit() {
    if (!editing) return;
    const price = parseInt(editPrice);
    if (!isNaN(price) && price > 0) {
      setMenu((prev) =>
        prev.map((m) =>
          m.name === editing.name && m.category === editing.category
            ? { ...m, name: editName, description: editDesc, price }
            : m
        )
      );
    }
    setEditing(null);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Lounge & Bar Menu</h1>
        <p className="text-slate-500 text-sm mt-1">Edit menu item names, descriptions, and prices.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {categories.map((cat) => (
          <div key={cat}>
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#C41230]">{cat}</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {menu.filter((m) => m.category === cat).map((item) => (
                <div key={item.name} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                  </div>
                  <span className="text-amber-700 font-bold text-sm shrink-0">₦{item.price.toLocaleString()}</span>
                  <button onClick={() => startEdit(item)}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors shrink-0">
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800">Edit Menu Item</h3>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description</label>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Price (₦)</label>
              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} className="flex-1 py-2.5 bg-[#C41230] text-white font-semibold rounded-xl text-sm hover:bg-[#9C0E25]">Save</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
