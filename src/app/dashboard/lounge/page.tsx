"use client";

import { useState, useRef, useEffect } from "react";
import { useBarList } from "@/hooks/queries/useBar";
import { useMenuItemList, useAddMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@/hooks/queries/useMenuItem";

// ─── Types ────────────────────────────────────────────────────────────────────

type Bar = {
  id: number;
  name: string;
  description?: string;
  desc?: string;
};

type MenuItem = {
  id: number;
  name: string;
  description?: string;
  desc?: string;
  price: number;
  category?: string | { value: string; label: string };
  image_url?: string;
  image?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function barsFromResponse(raw: unknown): Bar[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Bar[];
  const w = raw as { data?: unknown };
  if (Array.isArray(w.data)) return w.data as Bar[];
  return [];
}

function menuItemsFromResponse(raw: unknown): MenuItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as MenuItem[];
  const w = raw as { data?: unknown };
  if (Array.isArray(w.data)) return w.data as MenuItem[];
  return [];
}

function itemCategory(item: MenuItem): string {
  const c = item.category;
  if (!c) return "Other";
  if (typeof c === "string") return c;
  return c.label ?? c.value ?? "Other";
}

function itemImage(item: MenuItem): string {
  return item.image_url ?? item.image ?? "";
}

function itemDesc(item: MenuItem): string {
  return item.description ?? item.desc ?? "";
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_CATEGORIES = ["Cocktails", "Wines", "Beers", "Spirits", "Non-Alcoholic"];

const CATEGORY_ICONS: Record<string, string> = {
  Cocktails: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  Wines: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
  Beers: "M9 3h6l1 3H8L9 3zm-1 4h8v13a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm2 3v7m4-7v7",
  Spirits: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  "Non-Alcoholic": "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  Other: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
};

function catIcon(cat: string) {
  return CATEGORY_ICONS[cat] ?? CATEGORY_ICONS["Other"];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoungePage() {
  const [selectedBarId, setSelectedBarId] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImage, setEditImage] = useState("");

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState(PRESET_CATEGORIES[0]);
  const [newImage, setNewImage] = useState("");

  const editImgRef = useRef<HTMLInputElement>(null);
  const newImgRef = useRef<HTMLInputElement>(null);

  const { data: barsRaw, isLoading: barsLoading, isError: barsError } = useBarList();
  const bars: Bar[] = barsFromResponse(barsRaw);

  const barId = selectedBarId || (bars[0]?.id ? String(bars[0].id) : "");

  useEffect(() => {
    if (!selectedBarId && bars.length > 0) setSelectedBarId(String(bars[0].id));
  }, [bars, selectedBarId]);

  const { data: menuRaw, isLoading: menuLoading, isError: menuError } = useMenuItemList(barId);
  const allItems: MenuItem[] = menuItemsFromResponse(menuRaw);

  const usedCategories = Array.from(new Set(allItems.map(itemCategory)));
  const categories = [
    ...PRESET_CATEGORIES.filter((c) => usedCategories.includes(c)),
    ...usedCategories.filter((c) => !PRESET_CATEGORIES.includes(c)),
  ];
  const displayCategories = ["All", ...categories];

  const displayed =
    activeCategory === "All"
      ? allItems
      : allItems.filter((i) => itemCategory(i) === activeCategory);

  const addMutation = useAddMenuItem();
  const updateMutation = useUpdateMenuItem();
  const deleteMutation = useDeleteMenuItem();

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openAdd() {
    setNewName(""); setNewDesc(""); setNewPrice(""); setNewImage("");
    setNewCategory(activeCategory === "All" ? PRESET_CATEGORIES[0] : activeCategory);
    setAdding(true);
  }

  function saveNew() {
    const price = parseInt(newPrice);
    if (!newName.trim() || isNaN(price) || price <= 0 || !barId) return;
    addMutation.mutate(
      { barId, payload: { name: newName.trim(), description: newDesc.trim(), price, category: newCategory, image: newImage || undefined } },
      { onSuccess: () => setAdding(false) }
    );
  }

  function startEdit(item: MenuItem) {
    setEditing(item);
    setEditName(item.name);
    setEditDesc(itemDesc(item));
    setEditPrice(String(item.price));
    setEditImage(itemImage(item));
  }

  function saveEdit() {
    if (!editing || !barId) return;
    const price = parseInt(editPrice);
    if (!editName.trim() || isNaN(price) || price <= 0) return;
    updateMutation.mutate(
      {
        barId,
        itemId: String(editing.id),
        payload: { name: editName.trim(), description: editDesc.trim(), price, category: itemCategory(editing), image: editImage || undefined },
      },
      { onSuccess: () => setEditing(null) }
    );
  }

  function deleteItem(item: MenuItem) {
    if (!barId) return;
    deleteMutation.mutate({ barId, itemId: String(item.id) });
  }

  async function handleEditImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setEditImage(await readFileAsDataURL(file));
  }

  async function handleNewImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setNewImage(await readFileAsDataURL(file));
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (barsLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-slate-400">
        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading bars…</span>
      </div>
    );
  }

  if (barsError) {
    return <div className="py-20 text-center text-red-500 text-sm">Failed to load bars.</div>;
  }

  if (bars.length === 0) {
    return (
      <div className="py-20 text-center text-slate-400">
        <p className="font-semibold text-slate-600">No bars found.</p>
        <p className="text-sm mt-1">Add a bar/lounge location to get started.</p>
      </div>
    );
  }

  const selectedBar = bars.find((b) => String(b.id) === barId) ?? bars[0];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lounge &amp; Bar Menu</h1>
          <p className="text-slate-500 text-sm mt-1">
            {allItems.length} item{allItems.length !== 1 ? "s" : ""} across {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          </p>
        </div>

        {/* Bar selector — only shown if multiple bars */}
        {bars.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Bar</label>
            <select
              value={barId}
              onChange={(e) => { setSelectedBarId(e.target.value); setActiveCategory("All"); }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              {bars.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Selected bar name chip (when only 1 bar) */}
      {bars.length === 1 && (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-[#5A0E24]/10 text-[#5A0E24] rounded-full text-xs font-semibold">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {selectedBar.name}
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6 overflow-x-auto">
        {displayCategories.map((cat) => {
          const count = cat === "All" ? allItems.length : allItems.filter((i) => itemCategory(i) === cat).length;
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
                active ? "bg-white text-[#5A0E24] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {cat !== "All" && (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={catIcon(cat)} />
                </svg>
              )}
              {cat}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-[#5A0E24]/10 text-[#5A0E24]" : "bg-slate-200 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Menu list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeCategory !== "All" && (
              <svg className="w-4 h-4 text-[#5A0E24]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={catIcon(activeCategory)} />
              </svg>
            )}
            <h3 className="font-bold text-slate-800">{activeCategory}</h3>
            <span className="text-xs text-slate-400">{displayed.length} item{displayed.length !== 1 ? "s" : ""}</span>
          </div>
          <button
            onClick={openAdd}
            disabled={!barId}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#5A0E24] text-white text-xs font-semibold rounded-xl hover:bg-[#921224] disabled:opacity-40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        {menuLoading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading menu…</span>
          </div>
        ) : menuError ? (
          <div className="py-16 text-center text-red-500 text-sm">Failed to load menu items.</div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-medium">
              {activeCategory === "All" ? "No menu items yet" : `No items in ${activeCategory} yet`}
            </p>
            <p className="text-xs mt-1">Click &ldquo;Add Item&rdquo; to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {displayed.map((item) => {
              const img = itemImage(item);
              const cat = itemCategory(item);
              const isDeleting = deleteMutation.isPending;
              return (
                <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={catIcon(cat)} />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#5A0E24] font-medium bg-[#5A0E24]/5 px-1.5 py-0.5 rounded">{cat}</span>
                      {itemDesc(item) && (
                        <p className="text-xs text-slate-400 truncate">{itemDesc(item)}</p>
                      )}
                    </div>
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
                      disabled={isDeleting}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add modal ─────────────────────────────────────────────────────────── */}
      {adding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5A0E24]/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#5A0E24]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Add Menu Item</h3>
                <p className="text-xs text-slate-400">{selectedBar.name}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Category *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                {[...PRESET_CATEGORIES, ...usedCategories.filter((c) => !PRESET_CATEGORIES.includes(c))].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`e.g. ${newCategory === "Cocktails" ? "Pina Colada" : newCategory === "Wines" ? "Rosé Wine" : newCategory === "Beers" ? "Heineken" : newCategory === "Spirits" ? "Hennessy VS" : "Chapman"}`}
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
                placeholder="Short description"
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

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Photo <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
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

            {addMutation.isError && (
              <p className="text-xs text-red-500">Failed to add item. Please try again.</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveNew}
                disabled={!newName.trim() || !newPrice || parseInt(newPrice) <= 0 || addMutation.isPending}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-40 transition-colors"
              >
                {addMutation.isPending ? "Adding…" : "Add Item"}
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

      {/* ── Edit modal ────────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-slate-800">Edit Menu Item</h3>
              <p className="text-xs text-slate-400 mt-0.5">{itemCategory(editing)} · {selectedBar.name}</p>
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Photo <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
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
                <button
                  type="button"
                  onClick={() => editImgRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 hover:border-amber-400 hover:text-amber-600 transition-colors"
                >
                  Click to upload photo
                </button>
              )}
              <input ref={editImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleEditImage(e.target.files)} />
            </div>

            {updateMutation.isError && (
              <p className="text-xs text-red-500">Failed to save changes. Please try again.</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveEdit}
                disabled={!editName.trim() || !editPrice || parseInt(editPrice) <= 0 || updateMutation.isPending}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-40"
              >
                {updateMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
