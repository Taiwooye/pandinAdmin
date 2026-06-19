"use client";

import { useRef, useState } from "react";
import {
  useGalleryItemList,
  useUploadGalleryItem,
  useUpdateGalleryItem,
  useDeleteGalleryItem,
} from "@/hooks/queries/useGalleryItem";

// ─── Types ────────────────────────────────────────────────────────────────────

type GalleryItem = {
  id: number | string;
  url?: string;
  image_url?: string;
  photo?: string;
  alt_text?: string;
  caption?: string;
  title?: string;
  file_name?: string;
  sort_order?: number;
  created_at?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemsFromResponse(raw: unknown): GalleryItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as GalleryItem[];
  const w = raw as { data?: unknown };
  if (Array.isArray(w.data)) return w.data as GalleryItem[];
  return [];
}

function itemUrl(g: GalleryItem): string {
  return g.url ?? g.image_url ?? g.photo ?? "";
}

function itemCaption(g: GalleryItem): string {
  return g.alt_text ?? g.caption ?? g.title ?? g.file_name ?? "";
}

function itemId(g: GalleryItem): string {
  return String(g.id);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Inline caption edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: raw, isLoading, isError, error } = useGalleryItemList();
  const items: GalleryItem[] = itemsFromResponse(raw);

  const uploadMutation = useUploadGalleryItem();
  const updateMutation = useUpdateGalleryItem();
  const deleteMutation = useDeleteGalleryItem();

  // ── Upload ───────────────────────────────────────────────────────────────

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
    const mediaFiles = Array.from(files).filter((f) => ACCEPTED.includes(f.type));
    if (mediaFiles.length === 0) return;

    setUploading(true);
    setUploadError("");

    try {
      await Promise.all(
        mediaFiles.map((file) => {
          const fd = new FormData();
          fd.append("file", file);
          return uploadMutation.mutateAsync(fd);
        })
      );
    } catch {
      setUploadError("Some photos failed to upload. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  }

  // ── Caption edit ─────────────────────────────────────────────────────────

  function startEdit(g: GalleryItem) {
    setEditingId(itemId(g));
    setEditCaption(itemCaption(g));
  }

  function saveCaption(g: GalleryItem) {
    updateMutation.mutate(
      { id: itemId(g), payload: { caption: editCaption.trim() } },
      { onSuccess: () => setEditingId(null) }
    );
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  function deleteItem(g: GalleryItem) {
    deleteMutation.mutate(itemId(g));
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gallery</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? "Loading…" : `${items.length} photo${items.length !== 1 ? "s" : ""}`} · Upload, caption, and manage site images.
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mb-6 border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragging
            ? "border-[#5A0E24] bg-[#5A0E24]/5 scale-[1.01]"
            : "border-slate-200 hover:border-[#5A0E24]/40 hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
          multiple
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-medium">Uploading photos…</p>
          </div>
        ) : (
          <>
            <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-slate-600 text-sm font-semibold">Click to upload or drag &amp; drop</p>
            <p className="text-slate-400 text-xs mt-1">JPG, PNG, WEBP, MP4, MOV, AVI, MKV · max 100 MB</p>
          </>
        )}
      </div>

      {uploadError && (
        <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {uploadError}
          <button onClick={() => setUploadError("")} className="ml-auto">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading gallery…</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-16 space-y-1">
          <p className="text-red-500 font-semibold text-sm">Failed to load gallery.</p>
          {error instanceof Error && <p className="text-xs text-slate-400 font-mono">{error.message}</p>}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <p className="font-medium">No photos yet.</p>
          <p className="text-xs mt-1">Upload images above to get started.</p>
        </div>
      )}

      {/* Gallery grid */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const id = itemId(item);
            const url = itemUrl(item);
            const caption = itemCaption(item);
            const isEditing = editingId === id;
            const isDeleting = deleteMutation.isPending;

            return (
              <div key={id} className="group relative bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                {/* Image */}
                <div className="aspect-square overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>

                {/* Caption row */}
                <div className="px-3 py-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveCaption(item);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 text-xs px-2 py-1 border border-amber-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 min-w-0"
                      />
                      <button
                        onClick={() => saveCaption(item)}
                        disabled={updateMutation.isPending}
                        className="text-green-600 hover:text-green-700 disabled:opacity-40 shrink-0"
                        title="Save"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-slate-400 hover:text-slate-600 shrink-0"
                        title="Cancel"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-xs text-slate-600 font-medium truncate flex-1">
                        {caption || <span className="text-slate-400 italic">No caption</span>}
                      </p>
                      <button
                        onClick={() => startEdit(item)}
                        className="shrink-0 text-slate-300 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit caption"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => deleteItem(item)}
                  disabled={isDeleting}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 disabled:opacity-40"
                  title="Delete photo"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
