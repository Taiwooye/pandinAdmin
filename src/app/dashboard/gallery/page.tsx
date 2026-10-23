"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as galleryApi from "@/services/endpoints/gallery";
import {
  useUploadGalleryItem,
  useUpdateGalleryItem,
  useDeleteGalleryItem,
  useReorderGalleryItems,
} from "@/hooks/queries/useGalleryItem";
import {
  PageHeader,
  Button,
  Card,
  Badge,
  LoadingState,
  ErrorState,
  EmptyState,
  Feedback,
  errorMessage,
  SidePanel,
  ConfirmDialog,
  Field,
  TextInput,
  Select,
  Toggle,
} from "@/components/ui";

// ─── Types (match AdminGalleryItemResource) ───────────────────────────────────

type GalleryItem = {
  id: number;
  url: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  type: { value: string; label: string };
  size: number;
  alt_text: string;
  category: { value: string; label: string };
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Paginated = { data?: GalleryItem[]; meta?: { current_page: number; last_page: number } };

// ─── Plain-language categories (values = backend GalleryCategory enum) ───────

const CATEGORIES = [
  { value: "exterior", label: "Exterior", icon: "🌇", where: "The big slideshow at the top of the website's home page." },
  { value: "hotel", label: "Hotel", icon: "🏨", where: "Hotel section of the website gallery." },
  { value: "apartments", label: "Apartments", icon: "🏠", where: "Apartments section of the website gallery." },
  { value: "events", label: "Events", icon: "🎉", where: "Events section of the website gallery." },
  { value: "dining", label: "Dining", icon: "🍽️", where: "Dining section of the website gallery." },
  { value: "lounge", label: "Lounge", icon: "🍸", where: "Lounge section of the website gallery." },
];

const categoryInfo = (value: string) => CATEGORIES.find((c) => c.value === value);

// Backend accepts: jpg, jpeg, png, webp, mp4, mov, avi, mkv — max 102400 KB
const ACCEPTED_EXT = ["jpg", "jpeg", "png", "webp", "mp4", "mov", "avi", "mkv"];
const ACCEPT_ATTR =
  ".jpg,.jpeg,.png,.webp,.mp4,.mov,.avi,.mkv,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska";
const MAX_BYTES = 102400 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function nameToDescription(name: string): string {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function bySortOrder(a: GalleryItem, b: GalleryItem) {
  return a.sort_order - b.sort_order || a.id - b.id;
}

const isVideo = (g: GalleryItem) => g.type?.value === "video" || g.mime_type?.startsWith("video/");

/**
 * The admin list endpoint is paginated (20 per page). Load every page so the
 * grouping, counts and ordering cover all photos. Key sits under ["gallery"]
 * so the shared mutation hooks refresh it automatically.
 */
function useAllGalleryItems() {
  return useQuery({
    queryKey: ["gallery", "all"],
    queryFn: async () => {
      const all: GalleryItem[] = [];
      let page = 1;
      let last = 1;
      do {
        const res = (await galleryApi.list({ page })) as Paginated | GalleryItem[];
        if (Array.isArray(res)) return res;
        all.push(...(res.data ?? []));
        last = res.meta?.last_page ?? 1;
        page += 1;
      } while (page <= last && page <= 100);
      return all;
    },
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GalleryPage() {
  const { data, isLoading, isError } = useAllGalleryItems();
  const items = useMemo(() => [...(data ?? [])].sort(bySortOrder), [data]);

  const [filter, setFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState<GalleryItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState<{ success?: string; error?: string }>({});

  const deleteMutation = useDeleteGalleryItem();
  const reorderMutation = useReorderGalleryItems();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of items) c[g.category.value] = (c[g.category.value] ?? 0) + 1;
    return c;
  }, [items]);

  const groups = (filter ? CATEGORIES.filter((c) => c.value === filter) : CATEGORIES)
    .map((c) => ({ ...c, items: items.filter((g) => g.category.value === c.value) }))
    .filter((g) => filter || g.items.length > 0);

  function move(item: GalleryItem, direction: -1 | 1) {
    const sameCat = items.filter((g) => g.category.value === item.category.value);
    const idx = sameCat.findIndex((g) => g.id === item.id);
    const other = sameCat[idx + direction];
    if (!other) return;
    // Swap the two photos in the overall order, then renumber everything 0..n-1
    const order = items.map((g) => (g.id === item.id ? other : g.id === other.id ? item : g));
    const changes = order
      .map((g, i) => ({ id: g.id, sort_order: i }))
      .filter((c) => items.find((g) => g.id === c.id)?.sort_order !== c.sort_order);
    if (changes.length === 0) return;
    setNotice({});
    reorderMutation.mutate(changes, {
      onSuccess: () => setNotice({ success: "Order saved. The website now shows the photos in this order." }),
      onError: (err) => setNotice({ error: errorMessage(err) }),
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    setDeleteError("");
    deleteMutation.mutate(String(deleting.id), {
      onSuccess: () => {
        setDeleting(null);
        setNotice({ success: "Photo deleted. It has been removed from the website." });
      },
      onError: (err) => setDeleteError(errorMessage(err)),
    });
  }

  return (
    <div>
      <PageHeader
        title="Website photos"
        description="Add, describe and remove the photos and videos guests see on the website. The category you pick decides where each photo appears."
        action={
          <Button onClick={() => setUploadOpen(true)} className="text-base px-5 py-3">
            📤 Upload photos
          </Button>
        }
      />

      {/* Where photos appear */}
      <Card className="p-5 mb-6">
        <p className="text-sm font-semibold text-slate-700 mb-2">Where do photos appear on the website?</p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-600">
          {CATEGORIES.map((c) => (
            <li key={c.value}>
              <span className="mr-1">{c.icon}</span>
              <span className="font-semibold text-slate-700">{c.label}:</span> {c.where}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 mt-3">Photos marked &quot;Hidden&quot; stay here but are not shown on the website.</p>
      </Card>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[{ value: "", label: "All photos", icon: "🖼️" }, ...CATEGORIES].map((c) => {
          const active = filter === c.value;
          const count = c.value ? counts[c.value] ?? 0 : items.length;
          return (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                active ? "border-[#5A0E24] bg-[#5A0E24] text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {c.icon} {c.label} <span className={active ? "text-white/80" : "text-slate-400"}>({isLoading ? "–" : count})</span>
            </button>
          );
        })}
      </div>

      {(notice.success || notice.error) && (
        <div className="mb-5 flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <Feedback success={notice.success} error={notice.error} />
          <button onClick={() => setNotice({})} aria-label="Dismiss" className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {isLoading && <LoadingState label="Loading photos…" />}
      {isError && <ErrorState message="Could not load the photos. Check your internet connection and refresh the page." />}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon="🖼️"
          title="No photos yet"
          description="Upload your first photos to show them on the website."
          action={<Button onClick={() => setUploadOpen(true)}>📤 Upload photos</Button>}
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.value}>
              <div className="mb-3">
                <h2 className="text-lg font-bold text-slate-800">
                  {group.icon} {group.label}{" "}
                  <span className="text-slate-400 font-medium text-sm">
                    · {group.items.length} photo{group.items.length === 1 ? "" : "s"}
                  </span>
                </h2>
                <p className="text-sm text-slate-500">
                  Shown in: {group.where} They appear in the order below — use Earlier / Later to change it.
                </p>
              </div>
              {group.items.length === 0 ? (
                <EmptyState
                  icon={group.icon}
                  title={`No ${group.label} photos yet`}
                  action={<Button onClick={() => setUploadOpen(true)}>📤 Upload photos</Button>}
                />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.items.map((item, i) => (
                    <PhotoTile
                      key={item.id}
                      item={item}
                      position={i + 1}
                      isFirst={i === 0}
                      isLast={i === group.items.length - 1}
                      busy={reorderMutation.isPending}
                      onEdit={() => setEditing(item)}
                      onDelete={() => {
                        setDeleteError("");
                        setDeleting(item);
                      }}
                      onMove={(d) => move(item, d)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {uploadOpen && (
        <UploadPanel
          defaultCategory={filter || "hotel"}
          nextSortOrder={items.length ? Math.max(...items.map((g) => g.sort_order)) + 1 : 0}
          onClose={() => setUploadOpen(false)}
        />
      )}

      {editing && <EditPanel key={editing.id} item={editing} onClose={() => setEditing(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Delete this photo?"
          message={`"${deleting.alt_text || deleting.file_name}" will be removed from the website for good. This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={deleteMutation.isPending}
          error={deleteError}
        />
      )}
    </div>
  );
}

// ─── Photo tile ───────────────────────────────────────────────────────────────

function PhotoTile({
  item,
  position,
  isFirst,
  isLast,
  busy,
  onEdit,
  onDelete,
  onMove,
}: {
  item: GalleryItem;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <button onClick={onEdit} className="relative aspect-square bg-slate-100 block" title="Edit this photo">
        {isVideo(item) ? (
          <video src={item.url} muted preload="metadata" className="w-full h-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.alt_text} className="w-full h-full object-cover" />
        )}
        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold rounded-full px-2 py-0.5">#{position}</span>
        <span className="absolute top-2 right-2 flex gap-1">
          {isVideo(item) && <Badge tone="slate">🎬 Video</Badge>}
          {!item.is_published && <Badge tone="amber">Hidden</Badge>}
        </span>
      </button>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm text-slate-700 line-clamp-2 flex-1">
          {item.alt_text || <span className="text-slate-400 italic">No description</span>}
        </p>
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" className="flex-1" onClick={onEdit}>
            ✏️ Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600 hover:bg-red-50" aria-label="Delete photo" title="Delete photo">
            🗑️ Delete
          </Button>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 border border-slate-200"
            disabled={isFirst || busy}
            onClick={() => onMove(-1)}
            title="Show this photo earlier"
          >
            ← Earlier
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 border border-slate-200"
            disabled={isLast || busy}
            onClick={() => onMove(1)}
            title="Show this photo later"
          >
            Later →
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Upload panel ─────────────────────────────────────────────────────────────

type Pending = {
  key: string;
  file: File;
  description: string;
  status: "waiting" | "uploading" | "done" | "failed";
  error?: string;
};

function FileThumb({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  if (file.type.startsWith("video/") || !["jpg", "jpeg", "png", "webp"].includes(fileExt(file.name))) {
    return <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-2xl shrink-0">🎬</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 bg-slate-100" />;
}

let pendingSeq = 0;

function UploadPanel({
  defaultCategory,
  nextSortOrder,
  onClose,
}: {
  defaultCategory: string;
  nextSortOrder: number;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(defaultCategory);
  const [files, setFiles] = useState<Pending[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string }>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadGalleryItem();

  function addFiles(list: FileList | null) {
    if (!list) return;
    const ok: Pending[] = [];
    const bad: string[] = [];
    for (const f of Array.from(list)) {
      if (!ACCEPTED_EXT.includes(fileExt(f.name))) bad.push(`${f.name} — this type of file is not allowed`);
      else if (f.size > MAX_BYTES) bad.push(`${f.name} — larger than 100 MB`);
      else ok.push({ key: `f${++pendingSeq}`, file: f, description: nameToDescription(f.name), status: "waiting" });
    }
    setFiles((prev) => [...prev.filter((p) => p.status !== "done"), ...ok]);
    setSkipped(bad);
    setResult({});
    if (inputRef.current) inputRef.current.value = "";
  }

  const toUpload = files.filter((f) => f.status === "waiting" || f.status === "failed");
  const doneCount = files.filter((f) => f.status === "done").length;
  const hasFailed = files.some((f) => f.status === "failed");
  const uploadingIndex = files.findIndex((f) => f.status === "uploading");

  async function startUpload() {
    if (toUpload.some((f) => !f.description.trim())) {
      setResult({ error: "Please write a short description for every photo before uploading." });
      return;
    }
    setRunning(true);
    setResult({});
    let ok = 0;
    let failed = 0;
    let lastError = "";
    let order = nextSortOrder;
    // One at a time so staff can see progress and a single failure doesn't hide the rest
    for (const p of toUpload) {
      setFiles((prev) => prev.map((x) => (x.key === p.key ? { ...x, status: "uploading", error: undefined } : x)));
      const fd = new FormData();
      fd.append("file", p.file);
      fd.append("alt_text", p.description.trim());
      fd.append("category", category);
      fd.append("sort_order", String(order++));
      fd.append("is_published", "1");
      try {
        await uploadMutation.mutateAsync(fd);
        ok++;
        setFiles((prev) => prev.map((x) => (x.key === p.key ? { ...x, status: "done" } : x)));
      } catch (err) {
        failed++;
        lastError = errorMessage(err);
        const msg = lastError;
        setFiles((prev) => prev.map((x) => (x.key === p.key ? { ...x, status: "failed", error: msg } : x)));
      }
    }
    setRunning(false);
    const cat = categoryInfo(category)?.label ?? category;
    if (failed === 0) {
      setResult({ success: `${ok} photo${ok === 1 ? "" : "s"} uploaded to ${cat}. They are now on the website.` });
    } else {
      setResult({
        error: `${failed} photo${failed === 1 ? "" : "s"} could not be uploaded${ok ? ` (${ok} uploaded fine)` : ""}. ${lastError} Press "Try again".`,
      });
    }
  }

  return (
    <SidePanel
      title="Upload photos"
      subtitle="Choose where they go, pick the files, then press Upload."
      onClose={running ? () => {} : onClose}
      footer={
        <div className="space-y-3">
          {running && (
            <div>
              <p className="text-sm font-medium text-slate-600">
                Uploading {uploadingIndex + 1} of {files.length}… please keep this window open.
              </p>
              <div className="h-2 rounded-full bg-slate-200 mt-2 overflow-hidden">
                <div
                  className="h-full bg-[#5A0E24] transition-all"
                  style={{ width: `${(files.filter((f) => f.status === "done" || f.status === "failed").length / Math.max(files.length, 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
          <Feedback success={result.success} error={result.error} />
          <div className="flex gap-2">
            <Button onClick={startUpload} disabled={running || toUpload.length === 0} className="flex-1">
              {running
                ? "Uploading…"
                : hasFailed
                  ? "Try again"
                  : toUpload.length > 0
                    ? `Upload ${toUpload.length} photo${toUpload.length === 1 ? "" : "s"}`
                    : "Upload"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={running}>
              {doneCount > 0 && toUpload.length === 0 ? "Done" : "Cancel"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-slate-700">1. Where should these photos appear?</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                disabled={running}
                onClick={() => setCategory(c.value)}
                className={`text-left rounded-xl border-2 px-3 py-2.5 transition-all ${
                  category === c.value ? "border-[#5A0E24] bg-[#5A0E24]/5" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="block text-sm font-semibold text-slate-800">
                  {c.icon} {c.label}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">{c.where}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700">2. Pick the photos or videos</p>
          <div
            onClick={() => !running && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!running) addFiles(e.dataTransfer.files);
            }}
            className={`mt-2 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragging ? "border-[#5A0E24] bg-[#5A0E24]/5" : "border-slate-300 hover:border-[#5A0E24]/50 hover:bg-slate-50"
            }`}
          >
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm font-semibold text-slate-700">Click here to choose files, or drag them in</p>
            <p className="text-xs text-slate-500 mt-1">Photos (JPG, PNG, WEBP) or videos (MP4, MOV, AVI, MKV) · up to 100 MB each</p>
            <input ref={inputRef} type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </div>
          {skipped.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              These files were skipped:
              <ul className="list-disc ml-5">
                {skipped.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-700">3. Describe each photo</p>
            <p className="text-xs text-slate-500 mt-0.5">
              A few words about what is in the photo, e.g. &quot;Pool at sunset&quot;. This helps visitors and search engines.
            </p>
            <div className="space-y-3 mt-3">
              {files.map((p) => (
                <div key={p.key} className="flex items-start gap-3">
                  <FileThumb file={p.file} />
                  <div className="flex-1 min-w-0">
                    <TextInput
                      value={p.description}
                      disabled={running || p.status === "done"}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFiles((prev) => prev.map((x) => (x.key === p.key ? { ...x, description: v } : x)));
                      }}
                      placeholder="What is in this photo?"
                    />
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="truncate text-slate-400">{p.file.name}</span>
                      <span className="shrink-0 ml-2">
                        {p.status === "uploading" && <span className="text-slate-600 font-medium">Uploading…</span>}
                        {p.status === "done" && <span className="text-green-700 font-semibold">✓ Uploaded</span>}
                        {p.status === "failed" && <span className="text-red-600 font-semibold">Not uploaded</span>}
                        {(p.status === "waiting" || p.status === "failed") && !running && (
                          <button
                            type="button"
                            className="ml-2 text-slate-500 hover:text-red-600 underline"
                            onClick={() => setFiles((prev) => prev.filter((x) => x.key !== p.key))}
                          >
                            Remove
                          </button>
                        )}
                      </span>
                    </div>
                    {p.error && <p className="text-xs text-red-600 mt-0.5">{p.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SidePanel>
  );
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

function EditPanel({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  const [description, setDescription] = useState(item.alt_text ?? "");
  const [category, setCategory] = useState(item.category.value);
  const [published, setPublished] = useState(item.is_published);
  const [feedback, setFeedback] = useState<{ success?: string; error?: string }>({});
  const updateMutation = useUpdateGalleryItem();

  function save() {
    if (!description.trim()) {
      setFeedback({ error: "Please write a short description of the photo." });
      return;
    }
    setFeedback({});
    updateMutation.mutate(
      { id: String(item.id), payload: { alt_text: description.trim(), category, is_published: published } },
      {
        onSuccess: () => setFeedback({ success: "Changes saved." }),
        onError: (err) => setFeedback({ error: errorMessage(err) }),
      }
    );
  }

  const info = categoryInfo(category);

  return (
    <SidePanel
      title="Edit photo"
      subtitle={item.file_name}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback success={feedback.success} error={feedback.error} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={updateMutation.isPending} className="flex-1">
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl overflow-hidden bg-slate-100">
          {isVideo(item) ? (
            <video src={item.url} controls className="w-full max-h-72 object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.alt_text} className="w-full max-h-72 object-contain" />
          )}
        </div>

        <Field label="Description" hint={'A few words about what is in the photo, e.g. "Pool at sunset".'} required>
          <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is in this photo?" />
        </Field>

        <Field label="Category" hint={info ? `Shown in: ${info.where}` : undefined} required>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <Toggle
          checked={published}
          onChange={setPublished}
          label="Show on website"
          description={published ? "Visitors can see this photo." : "Hidden — kept here but not shown on the website."}
        />
      </div>
    </SidePanel>
  );
}
