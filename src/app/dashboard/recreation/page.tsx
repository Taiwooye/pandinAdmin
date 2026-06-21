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
  slug?: string;
  name?: string;
  type?: string | { value: string; label: string };
  description?: string;
  status?: string | { value: string; label: string };
  features?: string[];
  sort_order?: number;
  created_at?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES = [
  { value: "pool",         label: "Swimming Pool" },
  { value: "basketball",   label: "Basketball" },
  { value: "billiards",    label: "Billiards" },
  { value: "table_tennis", label: "Table Tennis" },
  { value: "gym",          label: "Gym" },
];

const STATUSES = [
  { value: "available",   label: "Available",    class: "bg-green-50 text-green-600" },
  { value: "coming_soon", label: "Coming Soon",  class: "bg-amber-50 text-amber-600" },
  { value: "maintenance", label: "Maintenance",  class: "bg-red-50 text-red-500" },
];

const TYPE_ICONS: Record<string, string> = {
  pool:         "🏊",
  basketball:   "🏀",
  billiards:    "🎱",
  table_tennis: "🏓",
  gym:          "🏋️",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemsFromResponse(raw: unknown): RecreationItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as RecreationItem[];
  const w = raw as { data?: unknown };
  if (Array.isArray(w.data)) return w.data as RecreationItem[];
  return [];
}

function itemId(r: RecreationItem): string { return String(r.id); }
function itemName(r: RecreationItem): string { return r.name ?? "Untitled"; }
function itemDescription(r: RecreationItem): string { return r.description ?? ""; }

function itemTypeValue(r: RecreationItem): string {
  if (!r.type) return "";
  return typeof r.type === "object" ? r.type.value : r.type;
}

function itemTypeLabel(r: RecreationItem): string {
  if (!r.type) return "";
  if (typeof r.type === "object") return r.type.label;
  return TYPES.find((t) => t.value === r.type)?.label ?? String(r.type);
}

function itemStatusValue(r: RecreationItem): string {
  if (!r.status) return "available";
  const raw = typeof r.status === "object" ? r.status.value : r.status;
  // normalise API aliases
  if (raw === "open" || raw === "active") return "available";
  return raw;
}

function itemStatusMeta(r: RecreationItem) {
  const val = itemStatusValue(r);
  return STATUSES.find((s) => s.value === val) ?? STATUSES[0];
}

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  type: string;
  description: string;
  status: string;
  features: string[];
  sort_order: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  type: "pool",
  description: "",
  status: "available",
  features: [],
  sort_order: "0",
};

function formFromItem(r: RecreationItem): FormState {
  return {
    name: itemName(r),
    type: itemTypeValue(r) || "pool",
    description: itemDescription(r),
    status: itemStatusValue(r),
    features: Array.isArray(r.features) ? [...r.features] : [],
    sort_order: String(r.sort_order ?? 0),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecreationPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingItem, setEditingItem] = useState<RecreationItem | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [featureInput, setFeatureInput] = useState("");
  const [formError, setFormError] = useState("");

  const { data: raw, isLoading, isError, error } = useRecreationItemList();
  const items: RecreationItem[] = itemsFromResponse(raw);

  const createMutation = useCreateRecreationItem();
  const updateMutation = useUpdateRecreationItem();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFeatureInput("");
    setFormError("");
    setModalMode("add");
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEdit(item: RecreationItem) {
    setForm(formFromItem(item));
    setFeatureInput("");
    setFormError("");
    setModalMode("edit");
    setEditingItem(item);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError("");
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError("");
  }

  // ── Feature tag input ─────────────────────────────────────────────────────

  function addFeature() {
    const val = featureInput.trim();
    if (!val || form.features.includes(val)) return;
    setField("features", [...form.features, val]);
    setFeatureInput("");
  }

  function removeFeature(f: string) {
    setField("features", form.features.filter((x) => x !== f));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setFormError("Name is required."); return; }
    if (!form.type) { setFormError("Type is required."); return; }

    const payload = {
      name,
      type: form.type,
      description: form.description.trim(),
      status: form.status,
      features: form.features,
      sort_order: parseInt(form.sort_order, 10) || 0,
    };

    if (modalMode === "add") {
      createMutation.mutate(payload, {
        onSuccess: closeModal,
        onError: (err) => setFormError(err.message || "Failed to create facility."),
      });
    } else if (editingItem) {
      updateMutation.mutate(
        { id: itemId(editingItem), payload },
        {
          onSuccess: closeModal,
          onError: (err) => setFormError(err.message || "Failed to update facility."),
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
            {isLoading ? "Loading…" : `${items.length} facilit${items.length !== 1 ? "ies" : "y"}`} · Manage leisure and recreational facilities.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#4a0b1e] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Facility
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-24 text-slate-400">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading facilities…</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-16 space-y-1">
          <p className="text-red-500 font-semibold text-sm">Failed to load recreation facilities.</p>
          {error instanceof Error && <p className="text-xs text-slate-400 font-mono">{error.message}</p>}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="text-center py-24 text-slate-400">
          <svg className="w-14 h-14 mx-auto mb-4 opacity-25" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
          <p className="font-semibold">No facilities yet.</p>
          <p className="text-xs mt-1">Click &quot;Add Facility&quot; to create the first one.</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const typeVal = itemTypeValue(item);
            const statusMeta = itemStatusMeta(item);
            const features = Array.isArray(item.features) ? item.features : [];

            return (
              <div key={itemId(item)} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                {/* Card header */}
                <div className="h-28 bg-gradient-to-br from-[#5A0E24]/5 to-[#5A0E24]/10 flex items-center justify-center">
                  <span className="text-5xl">{TYPE_ICONS[typeVal] ?? "🎯"}</span>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-slate-800 text-base leading-snug">{itemName(item)}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${statusMeta.class}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-medium mb-2">{itemTypeLabel(item)}</p>

                  {itemDescription(item) && (
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-3">
                      {itemDescription(item)}
                    </p>
                  )}

                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {features.map((f) => (
                        <span key={f} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => openEdit(item)}
                    className="mt-auto w-full py-2 text-sm font-semibold text-[#5A0E24] border border-[#5A0E24]/20 rounded-xl hover:bg-[#5A0E24]/5 transition-colors"
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
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">
                {modalMode === "add" ? "Add Facility" : "Edit Facility"}
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
                  Facility Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Olympic Swimming Pool"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setField("type", t.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.type === t.value
                          ? "border-[#5A0E24] bg-[#5A0E24]/5 text-[#5A0E24]"
                          : "border-slate-100 text-slate-600 hover:border-slate-200"
                      }`}
                    >
                      <span>{TYPE_ICONS[t.value]}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Status <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setField("status", s.value)}
                      className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                        form.status === s.value
                          ? `border-current ${s.class}`
                          : "border-slate-100 text-slate-500 hover:border-slate-200"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={3}
                  placeholder="Describe this facility…"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24] resize-none"
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Features</label>
                <div className="flex gap-2">
                  <input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                    placeholder="e.g. Heated Water, Lifeguard on Duty"
                    className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    disabled={!featureInput.trim()}
                    className="px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-40 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {form.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.features.map((f) => (
                      <span key={f} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {f}
                        <button
                          type="button"
                          onClick={() => removeFeature(f)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort order */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sort Order</label>
                <input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setField("sort_order", e.target.value)}
                  className="w-24 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                />
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
                  {isSaving ? "Saving…" : modalMode === "add" ? "Add Facility" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
