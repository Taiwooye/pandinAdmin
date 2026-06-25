"use client";

import { useRef, useState } from "react";
import {
  useVenueList,
  useCreateVenue,
  useUpdateVenue,
  useDeleteVenue,
  useUploadVenueMedia,
  useDeleteVenueMedia,
} from "@/hooks/queries/useVenue";

// ─── Types ────────────────────────────────────────────────────────────────────

type VenueMedia = {
  id: number | string;
  url?: string;
  image_url?: string;
  file_path?: string;
  file_name?: string;
  caption?: string;
  alt_text?: string;
  sort_order?: number;
};

type Venue = {
  id: number | string;
  name?: string;
  title?: string;
  description?: string;
  body?: string;
  capacity?: number | string;
  price?: number | string;
  rate?: number | string;
  price_per_hour?: number | string;
  price_per_day?: number | string;
  features?: string | string[];
  amenities?: string | string[];
  image_url?: string;
  url?: string;
  media?: VenueMedia[];
  is_available?: boolean;
  is_active?: boolean;
  is_published?: boolean;
  status?: string | { value: string; label: string };
  size?: number | string;
  area?: number | string;
  sort_order?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function venuesFromResponse(raw: unknown): Venue[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Venue[];
  const w = raw as { data?: unknown };
  if (Array.isArray(w.data)) return w.data as Venue[];
  return [];
}

function venueId(v: Venue): string { return String(v.id); }
function venueName(v: Venue): string { return v.name ?? v.title ?? "Untitled Venue"; }
function venueDescription(v: Venue): string { return v.description ?? v.body ?? ""; }
function venueCover(v: Venue): string {
  if (v.media && v.media.length > 0) return v.media[0].url ?? v.media[0].image_url ?? "";
  return v.image_url ?? v.url ?? "";
}
function venueCapacity(v: Venue): string {
  const c = v.capacity;
  if (!c) return "";
  return `${c} guests`;
}
function venuePrice(v: Venue): string {
  const p = v.price ?? v.rate ?? v.price_per_day ?? v.price_per_hour;
  if (!p) return "";
  return `₦${Number(p).toLocaleString()}`;
}
function venueSize(v: Venue): string {
  const s = v.size ?? v.area;
  if (!s) return "";
  return `${s} m²`;
}
function venueFeatures(v: Venue): string[] {
  const f = v.features ?? v.amenities;
  if (!f) return [];
  if (Array.isArray(f)) return f as string[];
  return String(f).split(",").map((s) => s.trim()).filter(Boolean);
}
function venueActive(v: Venue): boolean {
  if (v.is_available !== undefined) return v.is_available;
  if (v.is_active !== undefined) return v.is_active;
  if (v.is_published !== undefined) return v.is_published;
  if (v.status !== undefined) {
    const s = typeof v.status === "object" ? v.status.value : v.status;
    return s === "active" || s === "available" || s === "published";
  }
  return true;
}
function mediaId(m: VenueMedia): string { return String(m.id); }
function mediaUrl(m: VenueMedia): string { return m.url ?? m.image_url ?? ""; }

// ─── Form defaults ─────────────────────────────────────────────────────────

type VenueForm = {
  name: string;
  description: string;
  capacity: string;
  price: string;
  size: string;
  features: string;
  is_available: boolean;
};

const EMPTY_FORM: VenueForm = {
  name: "",
  description: "",
  capacity: "",
  price: "",
  size: "",
  features: "",
  is_available: true,
};

function formFromVenue(v: Venue): VenueForm {
  return {
    name: venueName(v),
    description: venueDescription(v),
    capacity: String(v.capacity ?? ""),
    price: String(v.price ?? v.rate ?? v.price_per_day ?? ""),
    size: String(v.size ?? v.area ?? ""),
    features: venueFeatures(v).join(", "),
    is_available: venueActive(v),
  };
}

function formToPayload(f: VenueForm) {
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    ...(f.capacity ? { capacity: Number(f.capacity) } : {}),
    ...(f.price ? { price: Number(f.price) } : {}),
    ...(f.size ? { size: f.size.trim() } : {}),
    ...(f.features.trim() ? { features: f.features.trim() } : {}),
    is_available: f.is_available,
    status: f.is_available ? "available" : "unavailable",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenuesPage() {
  // Venue modal
  const [venueModal, setVenueModal] = useState<{ open: boolean; mode: "add" | "edit"; venue: Venue | null }>({ open: false, mode: "add", venue: null });
  const [form, setForm] = useState<VenueForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Venue | null>(null);

  // Media modal
  const [mediaVenue, setMediaVenue] = useState<Venue | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const mediaFileRef = useRef<HTMLInputElement>(null);

  const { data: raw, isLoading, isError, error } = useVenueList();
  const venues: Venue[] = venuesFromResponse(raw);

  const createMutation = useCreateVenue();
  const updateMutation = useUpdateVenue();
  const deleteMutation = useDeleteVenue();
  const uploadMediaMutation = useUploadVenueMedia();
  const deleteMediaMutation = useDeleteVenueMedia();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Venue modal ───────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError("");
    setVenueModal({ open: true, mode: "add", venue: null });
  }

  function openEdit(v: Venue) {
    setForm(formFromVenue(v));
    setFormError("");
    setVenueModal({ open: true, mode: "edit", venue: v });
  }

  function closeVenueModal() {
    setVenueModal({ open: false, mode: "add", venue: null });
    setFormError("");
  }

  function onSubmitVenue(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Venue name is required."); return; }

    const payload = formToPayload(form);

    if (venueModal.mode === "add") {
      createMutation.mutate(payload, {
        onSuccess: closeVenueModal,
        onError: (err) => setFormError(err.message || "Failed to create venue."),
      });
    } else if (venueModal.venue) {
      updateMutation.mutate(
        { id: venueId(venueModal.venue), payload },
        {
          onSuccess: closeVenueModal,
          onError: (err) => setFormError(err.message || "Failed to update venue."),
        }
      );
    }
  }

  function set(key: keyof VenueForm, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
    setFormError("");
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function confirmDelete(v: Venue) { setDeleteTarget(v); }

  function executeDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(venueId(deleteTarget), {
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  }

  // ── Media modal ───────────────────────────────────────────────────────────

  function openMedia(v: Venue) {
    setMediaVenue(v);
    setMediaError("");
  }

  function closeMedia() {
    setMediaVenue(null);
    setMediaError("");
  }

  async function uploadMedia(files: FileList | null) {
    if (!files || !mediaVenue) return;
    const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
    const valid = Array.from(files).filter((f) => ACCEPTED.includes(f.type));
    if (!valid.length) return;

    setMediaUploading(true);
    setMediaError("");

    try {
      await Promise.all(
        valid.map((file) => {
          const fd = new FormData();
          fd.append("file", file);
          return uploadMediaMutation.mutateAsync({ id: venueId(mediaVenue), formData: fd });
        })
      );
    } catch (err: unknown) {
      setMediaError((err as Error).message || "Upload failed.");
    } finally {
      setMediaUploading(false);
      if (mediaFileRef.current) mediaFileRef.current.value = "";
    }
  }

  function deleteMedia(m: VenueMedia) {
    if (!mediaVenue) return;
    deleteMediaMutation.mutate({ id: venueId(mediaVenue), mediaId: mediaId(m) });
  }

  // Sync mediaVenue with refreshed venues list so media updates are reflected
  const liveMediaVenue = mediaVenue ? venues.find((v) => venueId(v) === venueId(mediaVenue)) ?? mediaVenue : null;
  const liveMedia: VenueMedia[] = (liveMediaVenue as Venue | null)?.media ?? [];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Venues</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? "Loading…" : `${venues.length} venue${venues.length !== 1 ? "s" : ""}`} · Manage event spaces and the Grand Ballroom.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#4a0b1e] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Venue
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-24 text-slate-400">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading venues…</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-16">
          <p className="text-red-500 font-semibold text-sm">Failed to load venues.</p>
          {error instanceof Error && <p className="text-xs text-slate-400 font-mono mt-1">{error.message}</p>}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && venues.length === 0 && (
        <div className="text-center py-24 text-slate-400">
          <svg className="w-14 h-14 mx-auto mb-4 opacity-25" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21V6.75A2.25 2.25 0 016 4.5h12a2.25 2.25 0 012.25 2.25V21M3.75 21H2.25m1.5 0h16.5m0 0H21m-1.5 0V6.75M6.75 9h10.5M6.75 12h10.5M6.75 15h6" />
          </svg>
          <p className="font-semibold">No venues yet.</p>
          <p className="text-xs mt-1">Click &quot;Add Venue&quot; to list your first event space.</p>
        </div>
      )}

      {/* Venue cards */}
      {!isLoading && !isError && venues.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {venues.map((v) => {
            const cover = venueCover(v);
            const active = venueActive(v);
            const features = venueFeatures(v);

            return (
              <div key={venueId(v)} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                {/* Cover image */}
                {cover ? (
                  <div className="h-52 bg-slate-100 overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt={venueName(v)} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${active ? "bg-green-500/90 text-white" : "bg-slate-500/80 text-white"}`}>
                      {active ? "Available" : "Unavailable"}
                    </span>
                  </div>
                ) : (
                  <div className="h-52 bg-gradient-to-br from-[#5A0E24]/10 to-[#5A0E24]/5 flex flex-col items-center justify-center relative">
                    <svg className="w-14 h-14 text-[#5A0E24]/20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21V6.75A2.25 2.25 0 016 4.5h12a2.25 2.25 0 012.25 2.25V21M3.75 21H2.25m1.5 0h16.5m0 0H21m-1.5 0V6.75M6.75 9h10.5M6.75 12h10.5M6.75 15h6" />
                    </svg>
                    <span className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full ${active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {active ? "Available" : "Unavailable"}
                    </span>
                  </div>
                )}

                {/* Details */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg font-bold text-slate-800 leading-snug">{venueName(v)}</h3>
                    {venuePrice(v) && (
                      <span className="shrink-0 text-sm font-bold text-[#5A0E24] bg-[#5A0E24]/5 px-3 py-1 rounded-full">
                        {venuePrice(v)}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-3 mb-3">
                    {venueCapacity(v) && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        {venueCapacity(v)}
                      </span>
                    )}
                    {venueSize(v) && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                        {venueSize(v)}
                      </span>
                    )}
                    {v.media && v.media.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                        </svg>
                        {v.media.length} photo{v.media.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {venueDescription(v) && (
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-3">
                      {venueDescription(v)}
                    </p>
                  )}

                  {/* Features */}
                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {features.slice(0, 5).map((f) => (
                        <span key={f} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{f}</span>
                      ))}
                      {features.length > 5 && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full">+{features.length - 5} more</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex gap-2 pt-3 border-t border-slate-50">
                    <button
                      onClick={() => openMedia(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                      </svg>
                      Photos
                    </button>
                    <button
                      onClick={() => openEdit(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#5A0E24] border border-[#5A0E24]/20 rounded-xl hover:bg-[#5A0E24]/5 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(v)}
                      className="w-9 h-9 flex items-center justify-center text-slate-400 border border-slate-200 rounded-xl hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                      title="Delete venue"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Venue add/edit modal ──────────────────────────────────────────── */}
      {venueModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">
                {venueModal.mode === "add" ? "Add Venue" : "Edit Venue"}
              </h2>
              <button onClick={closeVenueModal} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={onSubmitVenue} noValidate className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Venue Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Grand Ballroom, Conference Hall A"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  placeholder="Describe the venue, ambiance, and what it's suited for…"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24] resize-none"
                />
              </div>

              {/* Capacity + Price row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Capacity (guests)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.capacity}
                    onChange={(e) => set("capacity", e.target.value)}
                    placeholder="500"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Price (₦)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="500000"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                  />
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Size / Area <span className="text-slate-400 font-normal">(optional, e.g. &quot;800 m²&quot;)</span>
                </label>
                <input
                  value={form.size}
                  onChange={(e) => set("size", e.target.value)}
                  placeholder="800 m²"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Features / Amenities <span className="text-slate-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  value={form.features}
                  onChange={(e) => set("features", e.target.value)}
                  placeholder="Air conditioning, Stage, Dance floor, AV system"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]"
                />
              </div>

              {/* Availability toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Available for Booking</p>
                  <p className="text-xs text-slate-400">Show this venue to guests</p>
                </div>
                <button
                  type="button"
                  onClick={() => set("is_available", !form.is_available)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.is_available ? "bg-[#5A0E24]" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_available ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              {formError && <p className="text-xs text-red-500 font-medium">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeVenueModal}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#5A0E24] rounded-xl hover:bg-[#4a0b1e] disabled:opacity-50 transition-colors"
                >
                  {isSaving ? "Saving…" : venueModal.mode === "add" ? "Add Venue" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1">Delete Venue?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              <span className="font-semibold text-slate-700">&quot;{venueName(deleteTarget)}&quot;</span> will be permanently removed along with all its photos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Media modal ───────────────────────────────────────────────────── */}
      {mediaVenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Photos — {venueName(mediaVenue)}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{liveMedia.length} photo{liveMedia.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={closeMedia} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Upload zone */}
              <div
                onClick={() => mediaFileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-7 text-center cursor-pointer hover:border-[#5A0E24]/40 hover:bg-slate-50 transition-colors"
              >
                <input
                  ref={mediaFileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadMedia(e.target.files)}
                />
                {mediaUploading ? (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm">Uploading…</p>
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm text-slate-500 font-medium">Click to upload photos</p>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP, MP4 · max 100 MB</p>
                  </>
                )}
              </div>

              {mediaError && (
                <p className="text-xs text-red-500 font-medium">{mediaError}</p>
              )}

              {/* Photo grid */}
              {liveMedia.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {liveMedia.map((m) => (
                    <div key={mediaId(m)} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl(m)}
                        alt={m.caption ?? m.alt_text ?? m.file_name ?? ""}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <button
                        onClick={() => deleteMedia(m)}
                        disabled={deleteMediaMutation.isPending}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-40"
                        title="Remove photo"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">No photos uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
