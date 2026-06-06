"use client";

import { useState, useRef } from "react";
import { mockLoungeMenu, MenuItem } from "@/lib/mockData";

const ALL_CATEGORIES = ["Cocktails", "Wines", "Beers", "Spirits", "Non-Alcoholic"];

const CATEGORY_ICONS: Record<string, string> = {
  Cocktails:      "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  Wines:          "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
  Beers:          "M9 3h6l1 3H8L9 3zm-1 4h8v13a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm2 3v7m4-7v7",
  Spirits:        "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  "Non-Alcoholic":"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

type MenuItemWithImage = MenuItem & { image?: string };

export default function LoungePage() {
  const [menu, setMenu] = useState<MenuItemWithImage[]>(mockLoungeMenu);
  const [activeTab, setActiveTab] = useState(ALL_CATEGORIES[0]);

  // Edit state
  const [editing, setEditing] = useState<MenuItemWithImage | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImage, setEditImage] = useState("");

  // Add state
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newImage, setNewImage] = useState("");

  const editImgRef = useRef<HTMLInputElement>(null);
  const newImgRef = useRef<HTMLInputElement>(null);

  const tabItems = menu.filter((m) => m.category === activeTab);

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit(item: MenuItemWithImage) {
    setEditing(item);
    setEditName(item.name);
    setEditDesc(item.description);
    setEditPrice(String(item.price));
    setEditImage(item.image ?? "");
  }

  async function handleEditImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setEditImage(await readFileAsDataURL(file));
  }

  function saveEdit() {
    if (!editing) return;
    const price = parseInt(editPrice);
    if (!editName.trim() || isNaN(price) || price <= 0) return;
    setMenu((prev) =>
      prev.map((m) =>
        m.name === editing.name && m.category === editing.category
          ? { ...m, name: editName.trim(), description: editDesc.trim(), price, image: editImage || undefined }
          : m
      )
    );
    setEditing(null);
  }

  // ── Add ───────────────────────────────────────────────────────────────────

  function openAdd() {
    setNewName(""); setNewDesc(""); setNewPrice(""); setNewImage("");
    setAdding(true);
  }

  async function handleNewImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setNewImage(await readFileAsDataURL(file));
  }

  function saveNew() {
    const price = parseInt(newPrice);
    if (!newName.trim() || isNaN(price) || price <= 0) return;
    const item: MenuItemWithImage = {
      name: newName.trim(),
      description: newDesc.trim(),
      price,
      category: activeTab,
      image: newImage || undefined,
    };
    setMenu((prev) => [...prev, item]);
    setAdding(false);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function deleteItem(item: MenuItemWithImage) {
    setMenu((prev) => prev.filter((m) => !(m.name === item.name && m.category === item.category)));
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lounge &amp; Bar Menu</h1>
          <p className="text-slate-500 text-sm mt-1">
            {menu.length} items across {ALL_CATEGORIES.filter((c) => menu.some((m) => m.category === c)).length} categories
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6 overflow-x-auto">
        {ALL_CATEGORIES.map((cat) => {
          const count = menu.filter((m) => m.category === cat).length;
          const active = activeTab === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
                active ? "bg-white text-[#5A0E24] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[cat] ?? CATEGORY_ICONS["Cocktails"]} />
              </svg>
              {cat}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-[#5A0E24]/10 text-[#5A0E24]" : "bg-slate-200 text-slate-500"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Items list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Tab header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#5A0E24]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[activeTab]} />
            </svg>
            <h3 className="font-bold text-slate-800">{activeTab}</h3>
            <span className="text-xs text-slate-400">{tabItems.length} item{tabItems.length !== 1 ? "s" : ""}</span>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#5A0E24] text-white text-xs font-semibold rounded-xl hover:bg-[#921224] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        {tabItems.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-medium">No items in {activeTab} yet</p>
            <p className="text-xs mt-1">Click &ldquo;Add Item&rdquo; to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tabItems.map((item) => (
              <div key={item.name} className="px-6 py-4 flex items-center gap-4">
                {/* Optional image */}
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[item.category] ?? CATEGORY_ICONS["Cocktails"]} />
                    </svg>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>
                </div>

                <span className="text-amber-700 font-bold text-sm shrink-0">₦{item.price.toLocaleString()}</span>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item)}
                    className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add modal ─────────────────────────────────────────────────────── */}
      {adding && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5A0E24]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#5A0E24]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Add {activeTab} Item</h3>
                <p className="text-xs text-slate-400">New entry for {activeTab}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`e.g. ${activeTab === "Cocktails" ? "Pina Colada" : activeTab === "Wines" ? "Rosé Wine" : activeTab === "Beers" ? "Heineken" : activeTab === "Spirits" ? "Hennessy VS" : "Chapman"}`}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                placeholder="Short description of the item"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Price (₦) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₦</span>
                <input
                  type="number"
                  min={0}
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Photo <span className="normal-case font-normal text-slate-400">(optional)</span></label>
              {newImage ? (
                <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newImage} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewImage("")}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => newImgRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 hover:border-amber-400 hover:text-amber-600 transition-colors"
                >
                  Click to upload photo
                </button>
              )}
              <input ref={newImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleNewImage(e.target.files)} />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveNew}
                disabled={!newName.trim() || !newPrice || parseInt(newPrice) <= 0}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-40 transition-colors"
              >
                Add Item
              </button>
              <button
                onClick={() => setAdding(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-slate-800">Edit Menu Item</h3>
              <p className="text-xs text-slate-400 mt-0.5">{editing.category}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Price (₦)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₦</span>
                <input
                  type="number"
                  min={0}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Photo <span className="normal-case font-normal text-slate-400">(optional)</span></label>
              {editImage ? (
                <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editImage} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button type="button" onClick={() => editImgRef.current?.click()} className="px-3 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-lg">Replace</button>
                    <button type="button" onClick={() => setEditImage("")} className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg">Remove</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => editImgRef.current?.click()} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 hover:border-amber-400 hover:text-amber-600 transition-colors">
                  Click to upload photo
                </button>
              )}
              <input ref={editImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleEditImage(e.target.files)} />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveEdit}
                disabled={!editName.trim() || !editPrice || parseInt(editPrice) <= 0}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-40"
              >
                Save
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
