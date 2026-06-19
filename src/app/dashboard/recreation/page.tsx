"use client";

import { useState } from "react";
import {
  useRecreationItemList,
  useCreateRecreationItem,
  useUpdateRecreationItem,
} from "@/hooks/queries/useRecreationItem";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecreationItem = {
  id: number | string;
  name?: string;
  title?: string;
  description?: string;
  body?: string;
  content?: string;
  image_url?: string;
  url?: string;
  photo?: string;
  icon?: string;
  status?: string | { value: string; label: string };
  is_active?: boolean;
  is_published?: boolean;
  sort_order?: number;
  created_at?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemsFromResponse(raw: unknown): RecreationItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as RecreationItem[];
  const w = raw as { data?: unknown };
  if (Array.isArray(w.data)) return w.data as RecreationItem[];
  return [];
}

function itemId(r: RecreationItem): string {
  return String(r.id);
}

function itemName(r: RecreationItem): string {
  return r.name ?? r.title ?? "Untitled";
}

function itemDescription(r: RecreationItem): string {
  return r.description ?? r.body ?? r.content ?? "";
}

function itemImage(r: RecreationItem): string {
  return r.image_url ?? r.url ?? r.photo ?? "";
}

type ItemStatus = "active" | "coming_soon" | "inactive";

function itemStatus(r: RecreationItem): ItemStatus {
  if (r.status !== undefined) {
    const val = typeof r.status === "object" ? r.status.value : r.status;
    if (val === "active" || val === "available" || val === "published") return "active";
    if (val === "coming_soon" || val === "coming-soon" || val === "comingsoon") return "coming_soon";
    return "inactive";
  }
  if (r.is_active !== undefined) return r.is_active ? "active" : "inactive";
  if (r.is_published !== undefined) return r.is_published ? "active" : "inactive";
  return "active";
}

function itemStatusLabel(r: RecreationItem): string {
  const s = itemStatus(r);
  if (s === "coming_soon") return "Coming Soon";
  if (s === "inactive") return "Inactive";
  return "Active";
}

function itemStatusClass(r: RecreationItem): string {
  const s = itemStatus(r);
  if (s === "coming_soon") return "bg-amber-50 text-amber-600";
  if (s === "inactive") return "bg-slate-100 text-slate-500";
  return "bg-green-50 text-green-600";
}

// ─── Empty modal state ───────────────────────────────────────────────────────

type ModalState = {
  open: boolean;
  mode: "add" | "edit";
  item: RecreationItem | null;
};

const CLOSED: ModalState = { open: false, mode: "add", item: null };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecreationPage() {
  const [modal, setModal] = useState<ModalState>(CLOSED);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState("");

  const { data: raw, isLoading, isError, error } = useRecreationItemList();
  const items: RecreationItem[] = itemsFromResponse(raw);

  const createMutation = useCreateRecreationItem();
  const updateMutation = useUpdateRecreationItem();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openAdd() {
    setFormName("");
    setFormDesc("");
    setFormImage("");
    setFormActive(true);
    setFormError("");
    setModal({ open: true, mode: "add", item: null });
  }

  function openEdit(item: RecreationItem) {
    setFormName(itemName(item));
    setFormDesc(itemDescription(item));
    setFormImage(itemImage(item));
    setFormActive(itemStatus(item) === "active");
    setFormError("");
    setModal({ open: true, mode: "edit", item });
  }

  function closeModal() {
    setModal(CLOSED);
    setFormError("");
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name) { setFormError("Name is required."); return; }

    const payload = {
      name,
      description: formDesc.trim(),
      ...(formImage.trim() ? { image_url: formImage.trim() } : {}),
      is_active: formActive,
      status: formActive ? "active" : "inactive",
    };

    if (modal.mode === "add") {
      createMutation.mutate(payload, {
        onSuccess: closeModal,
        onError: (err) => setFormError(err.message || "Failed to create activity."),
      });
    } else if (modal.item) {
      updateMutation.mutate(
        { id: itemId(modal.item), payload },
        {
          onSuccess: closeModal,
          onError: (err) => setFormError(err.message || "Failed to update activity."),
        }
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recreation</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? "Loading…" : `${items.length} activit${items.length !== 1 ? "ies" : "y"}`} · Manage leisure and recreational facilities.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#4a0b1e] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Activity
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-24 text-slate-400">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading activities…</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-16 space-y-1">
          <p className="text-red-500 font-semibold text-sm">Failed to load recreation items.</p>
          {error instanceof Error && (
            <p className="text-xs text-slate-400 font-mono">{error.message}</p>
          )}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="text-center py-24 text-slate-400">
          <svg className="w-14 h-14 mx-auto mb-4 opacity-25" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          <p className="font-semibold">No activities yet.</p>
          <p className="text-xs mt-1">Click "Add Activity" to create the first one.</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const img = itemImage(item);
            return (
              <div key={itemId(item)} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                {/* Image */}
                {img ? (
                  <div className="h-44 bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={itemName(item)}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  </div>
                )}

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-800 text-base leading-snug">{itemName(item)}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${itemStatusClass(item)}`}>
                      {itemStatusLabel(item)}
                    </span>
                  </div>

                  {itemDescription(item) && (
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 flex-1">
                      {itemDescription(item)}
                    </p>
                  )}

                  <button
                    onClick={() => openEdit(item)}
                    className="mt-4 w-full py-2 text-sm font-semibold text-[#5A0E24] border border-[#5A0E24]/20 rounded-xl hover:bg-[#5A0E24]/5 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">
                {modal.mode === "add" ? "Add Activity" : "Edit Activity"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} noValidate className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Activity Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setFormError(""); }}
                  placeholder="e.g. Swimming Pool, Gym, Tennis Court"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={4}
                  placeholder="Describe this facility or activity…"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24] resize-none"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Image URL <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://…"
                  type="url"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                />
              </div>

              {/* Status toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Active</p>
                  <p className="text-xs text-slate-400">Show this activity to guests</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormActive((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${formActive ? "bg-[#5A0E24]" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formActive ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Error */}
              {formError && (
                <p className="text-xs text-red-500 font-medium">{formError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#5A0E24] rounded-xl hover:bg-[#4a0b1e] disabled:opacity-50 transition-colors"
                >
                  {isSaving ? "Saving…" : modal.mode === "add" ? "Add Activity" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
