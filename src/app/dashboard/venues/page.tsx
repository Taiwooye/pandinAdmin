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
  TextArea,
  Select,
  TagInput,
} from "@/components/ui";

// ─── Types (match AdminVenueResource / AdminMediaResource) ────────────────────

type VenueMedia = {
  id: number;
  url: string;
  file_name?: string;
  mime_type?: string;
  type?: { value: string; label: string };
};

type VenueStatus = "available" | "booked" | "maintenance";

type Venue = {
  id: number;
  name: string;
  description: string | null;
  min_capacity: number | null;
  max_capacity: number | null;
  floor_space_sqm: number | null;
  price_per_day: number | string | null;
  status: { value: string; label: string } | string | null;
  features: string[] | null;
  event_types: string[] | null;
  sort_order?: number;
  media?: VenueMedia[];
};

// ─── Plain-language labels ────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: VenueStatus; label: string; hint: string; tone: "green" | "amber" | "red" }[] = [
  { value: "available", label: "Available", hint: "Guests can book this hall", tone: "green" },
  { value: "booked", label: "Booked", hint: "Already taken – shown as not available", tone: "amber" },
  { value: "maintenance", label: "Closed for maintenance", hint: "Temporarily closed for repairs or cleaning", tone: "red" },
];

// Backend accepts: jpg, jpeg, png, webp, mp4, mov, avi, mkv — max 100 MB
const ACCEPTED_EXT = ["jpg", "jpeg", "png", "webp", "mp4", "mov", "avi", "mkv"];
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function venuesFromResponse(raw: unknown): Venue[] {
  if (Array.isArray(raw)) return raw as Venue[];
  const d = (raw as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as Venue[]) : [];
}

function statusValue(v: Venue): VenueStatus {
  const s = typeof v.status === "object" && v.status ? v.status.value : v.status;
  return s === "booked" || s === "maintenance" ? s : "available";
}

function statusInfo(v: Venue) {
  return STATUS_OPTIONS.find((s) => s.value === statusValue(v)) ?? STATUS_OPTIONS[0];
}

function naira(n: number | string | null | undefined): string {
  const num = Number(n);
  if (n === null || n === undefined || n === "" || Number.isNaN(num)) return "";
  return `₦${num.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

function guestsText(v: Venue): string {
  const min = v.min_capacity;
  const max = v.max_capacity;
  if (min && max) return `${min.toLocaleString()}–${max.toLocaleString()} guests`;
  if (max) return `Up to ${max.toLocaleString()} guests`;
  if (min) return `From ${min.toLocaleString()} guests`;
  return "";
}

function isVideo(m: VenueMedia): boolean {
  return m.type?.value === "video" || (m.mime_type ?? "").startsWith("video/");
}

function coverPhoto(v: Venue): string {
  const photo = v.media?.find((m) => !isVideo(m));
  return photo?.url ?? "";
}

// ─── Form ─────────────────────────────────────────────────────────────────────

type VenueForm = {
  name: string;
  description: string;
  minCapacity: string;
  maxCapacity: string;
  pricePerDay: string;
  floorSpace: string;
  features: string[];
  eventTypes: string[];
  status: VenueStatus;
};

const EMPTY_FORM: VenueForm = {
  name: "",
  description: "",
  minCapacity: "",
  maxCapacity: "",
  pricePerDay: "",
  floorSpace: "",
  features: [],
  eventTypes: [],
  status: "available",
};

const numStr = (n: number | string | null | undefined) => (n === null || n === undefined ? "" : String(Number(n)));

function formFromVenue(v: Venue): VenueForm {
  return {
    name: v.name ?? "",
    description: v.description ?? "",
    minCapacity: numStr(v.min_capacity),
    maxCapacity: numStr(v.max_capacity),
    pricePerDay: numStr(v.price_per_day),
    floorSpace: numStr(v.floor_space_sqm),
    features: Array.isArray(v.features) ? v.features : [],
    eventTypes: Array.isArray(v.event_types) ? v.event_types : [],
    status: statusValue(v),
  };
}

const isWholeNumber = (s: string) => /^\d+$/.test(s.trim());
const isAmount = (s: string) => /^\d+(\.\d{1,2})?$/.test(s.trim());

/** Returns a plain-English problem with the form, or "" if it's fine to save */
function validate(f: VenueForm): string {
  if (!f.name.trim()) return "Please enter the hall's name.";
  if (!f.description.trim()) return "Please write a short description of the hall.";
  if (!isWholeNumber(f.minCapacity)) return "Please enter the smallest number of guests (whole number).";
  if (!isWholeNumber(f.maxCapacity)) return "Please enter the largest number of guests (whole number).";
  if (Number(f.minCapacity) > Number(f.maxCapacity)) return "The smallest number of guests can't be more than the largest.";
  if (!isAmount(f.pricePerDay.replace(/,/g, ""))) return "Please enter the price per day in Naira (numbers only).";
  if (!isWholeNumber(f.floorSpace)) return "Please enter the floor space in square metres (whole number).";
  return "";
}

// Maps the form to AdminVenueController store/update rules
function formToPayload(f: VenueForm) {
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    min_capacity: parseInt(f.minCapacity, 10),
    max_capacity: parseInt(f.maxCapacity, 10),
    price_per_day: Number(f.pricePerDay.replace(/,/g, "")),
    floor_space_sqm: parseInt(f.floorSpace, 10),
    features: f.features,
    event_types: f.eventTypes,
    status: f.status,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VenuesPage() {
  const { data: raw, isLoading, isError } = useVenueList();
  const venues = venuesFromResponse(raw);

  const [panel, setPanel] = useState<{ mode: "add" } | { mode: "edit"; venue: Venue } | null>(null);
  const [photosFor, setPhotosFor] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Venue | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");

  const deleteMutation = useDeleteVenue();

  const photosVenue = photosFor !== null ? venues.find((v) => v.id === photosFor) ?? null : null;

  function executeDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    const name = deleteTarget.name;
    deleteMutation.mutate(String(deleteTarget.id), {
      onSuccess: () => {
        setDeleteTarget(null);
        setNotice(`"${name}" was deleted.`);
      },
      onError: (err) => setDeleteError(errorMessage(err)),
    });
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Event hall"
        description="The halls guests can book for weddings, parties and conferences. Update the price, size and photos shown on the website."
        action={
          <Button
            onClick={() => {
              setNotice("");
              setPanel({ mode: "add" });
            }}
          >
            + Add a hall
          </Button>
        }
      />

      {notice && (
        <div className="mb-4">
          <Feedback success={notice} />
        </div>
      )}

      {isLoading && <LoadingState label="Loading event halls…" />}
      {isError && <ErrorState message="Could not load the event halls. Check your internet connection and refresh the page." />}

      {!isLoading && !isError && venues.length === 0 && (
        <EmptyState
          icon="🎉"
          title="No event halls yet"
          description="Add your first hall so guests can see it on the website."
          action={<Button onClick={() => setPanel({ mode: "add" })}>+ Add a hall</Button>}
        />
      )}

      {!isLoading && !isError && venues.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {venues.map((v) => (
            <VenueCard
              key={v.id}
              venue={v}
              onEdit={() => {
                setNotice("");
                setPanel({ mode: "edit", venue: v });
              }}
              onPhotos={() => {
                setNotice("");
                setPhotosFor(v.id);
              }}
              onDelete={() => {
                setNotice("");
                setDeleteError("");
                setDeleteTarget(v);
              }}
            />
          ))}
        </div>
      )}

      {panel && (
        <VenueFormPanel
          key={panel.mode === "edit" ? panel.venue.id : "new"}
          venue={panel.mode === "edit" ? panel.venue : null}
          onClose={() => setPanel(null)}
          onSaved={(msg) => {
            setPanel(null);
            setNotice(msg);
          }}
        />
      )}

      {photosVenue && <PhotosPanel venue={photosVenue} onClose={() => setPhotosFor(null)} />}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget.name}"?`}
          message="This hall and all its photos will be removed from the website. This can't be undone."
          confirmLabel="Yes, delete hall"
          onConfirm={executeDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteMutation.isPending}
          error={deleteError}
        />
      )}
    </div>
  );
}

// ─── Venue card ───────────────────────────────────────────────────────────────

function VenueCard({ venue: v, onEdit, onPhotos, onDelete }: { venue: Venue; onEdit: () => void; onPhotos: () => void; onDelete: () => void }) {
  const cover = coverPhoto(v);
  const status = statusInfo(v);
  const guests = guestsText(v);
  const price = naira(v.price_per_day);
  const features = v.features ?? [];
  const eventTypes = v.event_types ?? [];
  const photoCount = v.media?.length ?? 0;

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative h-48 bg-gradient-to-br from-[#5A0E24]/10 to-[#5A0E24]/5">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={v.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <span className="text-4xl">📷</span>
            <span className="text-sm mt-1">No photo yet</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-800">{v.name}</h3>
          {price && (
            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-[#5A0E24]">{price}</div>
              <div className="text-xs text-slate-500">per day</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
          {guests && <span>👥 {guests}</span>}
          {v.floor_space_sqm ? <span>📐 {v.floor_space_sqm.toLocaleString()} m² floor space</span> : null}
          <span>🖼️ {photoCount} photo{photoCount === 1 ? "" : "s"}</span>
        </div>

        {v.description && <p className="text-sm text-slate-500 mt-3 line-clamp-2">{v.description}</p>}

        {eventTypes.length > 0 && (
          <p className="text-sm text-slate-600 mt-3">
            <span className="font-semibold">Good for:</span> {eventTypes.join(", ")}
          </p>
        )}

        {features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {features.slice(0, 6).map((f) => (
              <span key={f} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                {f}
              </span>
            ))}
            {features.length > 6 && <span className="text-xs px-2.5 py-1 text-slate-400">+{features.length - 6} more</span>}
          </div>
        )}

        <div className="mt-auto pt-4 flex flex-wrap gap-2">
          <Button onClick={onEdit} className="flex-1">
            Edit details
          </Button>
          <Button variant="secondary" onClick={onPhotos} className="flex-1">
            Photos
          </Button>
          <Button variant="ghost" onClick={onDelete} className="text-red-600 hover:bg-red-50">
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Add / edit panel ─────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function VenueFormPanel({ venue, onClose, onSaved }: { venue: Venue | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState<VenueForm>(venue ? formFromVenue(venue) : EMPTY_FORM);
  const [error, setError] = useState("");
  const createMutation = useCreateVenue();
  const updateMutation = useUpdateVenue();
  const saving = createMutation.isPending || updateMutation.isPending;

  function set<K extends keyof VenueForm>(key: K, value: VenueForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  function save() {
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    const payload = formToPayload(form);
    const onError = (err: unknown) => setError(errorMessage(err));
    if (venue) {
      updateMutation.mutate({ id: String(venue.id), payload }, { onSuccess: () => onSaved(`Changes to "${payload.name}" were saved.`), onError });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onSaved(`"${payload.name}" was added. You can now add photos.`), onError });
    }
  }

  return (
    <SidePanel
      title={venue ? "Edit hall" : "Add a hall"}
      subtitle={venue ? venue.name : "Fields marked * are required"}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback error={error} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : venue ? "Save changes" : "Add hall"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-8">
        <Section title="Basic details">
          <Field label="Hall name" required>
            <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Grand Ballroom" />
          </Field>
          <Field label="Description" hint="A few sentences guests will read on the website" required>
            <TextArea
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the hall, the atmosphere and what it's best for…"
            />
          </Field>
          <Field label="Can guests book it right now?">
            <Select value={form.status} onChange={(e) => set("status", e.target.value as VenueStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} – {s.hint}
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        <Section title="Size & price">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fewest guests" hint="Smallest group" required>
              <TextInput type="number" inputMode="numeric" min={0} step={1} value={form.minCapacity} onChange={(e) => set("minCapacity", e.target.value)} placeholder="e.g. 100" />
            </Field>
            <Field label="Most guests" hint="Largest group" required>
              <TextInput type="number" inputMode="numeric" min={0} step={1} value={form.maxCapacity} onChange={(e) => set("maxCapacity", e.target.value)} placeholder="e.g. 500" />
            </Field>
          </div>
          <Field label="Price per day (₦)" hint="Numbers only, no commas" required>
            <TextInput type="number" inputMode="decimal" min={0} value={form.pricePerDay} onChange={(e) => set("pricePerDay", e.target.value)} placeholder="e.g. 500000" />
          </Field>
          {form.pricePerDay && naira(form.pricePerDay) && <p className="-mt-2 text-xs text-slate-500">Guests will see {naira(form.pricePerDay)} per day</p>}
          <Field label="Floor space (square metres)" hint="Whole number, e.g. 800" required>
            <TextInput type="number" inputMode="numeric" min={0} step={1} value={form.floorSpace} onChange={(e) => set("floorSpace", e.target.value)} placeholder="e.g. 800" />
          </Field>
        </Section>

        <Section title="What's included" hint="Type each item and press Enter, e.g. Air conditioning, Stage, Sound system">
          <TagInput value={form.features} onChange={(v) => set("features", v)} placeholder="Type an item and press Enter" />
        </Section>

        <Section title="Event types" hint="What kind of events is this hall good for? e.g. Weddings, Conferences, Birthdays">
          <TagInput value={form.eventTypes} onChange={(v) => set("eventTypes", v)} placeholder="Type an event type and press Enter" />
        </Section>

        <Section title="Photos">
          <p className="text-sm text-slate-500">
            {venue
              ? 'Close this form and click "Photos" on the hall to add or remove pictures.'
              : 'Save the hall first, then click "Photos" on its card to add pictures.'}
          </p>
        </Section>
      </div>
    </SidePanel>
  );
}

// ─── Photos panel ─────────────────────────────────────────────────────────────

function PhotosPanel({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadVenueMedia();
  const remove = useDeleteVenueMedia();
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<VenueMedia | null>(null);
  const [removeError, setRemoveError] = useState("");
  const media = venue.media ?? [];

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setSuccess("");
    setError("");
    const all = Array.from(files);
    const valid = all.filter((f) => ACCEPTED_EXT.includes((f.name.split(".").pop() ?? "").toLowerCase()) && f.size <= MAX_UPLOAD_BYTES);
    const skipped = all.length - valid.length;
    if (valid.length === 0) {
      setError("These files can't be used. Please choose JPG, PNG or WEBP photos (or MP4/MOV videos) under 100 MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    const results = await Promise.allSettled(
      valid.map((file) => {
        const fd = new FormData();
        fd.append("file", file);
        return upload.mutateAsync({ id: String(venue.id), formData: fd });
      })
    );
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";

    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    const done = results.length - failed.length;
    if (done > 0) setSuccess(`${done} file${done === 1 ? "" : "s"} uploaded.`);
    if (failed.length > 0) setError(`${failed.length} file${failed.length === 1 ? "" : "s"} could not be uploaded: ${errorMessage(failed[0].reason)}`);
    else if (skipped > 0) setError(`${skipped} file${skipped === 1 ? " was" : "s were"} skipped (wrong type or over 100 MB).`);
  }

  function confirmRemove() {
    if (!removeTarget) return;
    setRemoveError("");
    remove.mutate(
      { id: String(venue.id), mediaId: String(removeTarget.id) },
      {
        onSuccess: () => {
          setRemoveTarget(null);
          setError("");
          setSuccess("Photo removed.");
        },
        onError: (err) => setRemoveError(errorMessage(err)),
      }
    );
  }

  return (
    <SidePanel title="Photos" subtitle={venue.name} onClose={onClose} footer={<Button variant="secondary" onClick={onClose} className="w-full">Done</Button>}>
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-[#5A0E24]/50 hover:bg-slate-50 disabled:opacity-60"
        >
          <div className="text-3xl mb-2">{uploading ? "⏳" : "⬆️"}</div>
          <p className="text-sm font-semibold text-slate-700">{uploading ? "Uploading… please wait" : "Click to add photos"}</p>
          <p className="text-xs text-slate-500 mt-1">JPG, PNG or WEBP photos (MP4/MOV videos also work) · up to 100 MB each · you can pick several</p>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.avi,.mkv,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />

        <Feedback success={success} error={error} />

        {media.length === 0 ? (
          <EmptyState icon="🖼️" title="No photos yet" description="The first photo you add becomes the main picture on the website." />
        ) : (
          <>
            <p className="text-xs text-slate-500">The first photo is used as the main picture.</p>
            <div className="grid grid-cols-2 gap-3">
              {media.map((m, i) => (
                <div key={m.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {isVideo(m) ? (
                      <video src={m.url} className="w-full h-full object-cover" muted controls preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={m.file_name ?? venue.name} className="w-full h-full object-cover" />
                    )}
                    {i === 0 && (
                      <span className="absolute top-2 left-2">
                        <Badge tone="wine">Main photo</Badge>
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setRemoveError("");
                        setRemoveTarget(m);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {removeTarget && (
        <ConfirmDialog
          title="Remove this photo?"
          message="It will no longer show on the website. This can't be undone."
          confirmLabel="Yes, remove"
          onConfirm={confirmRemove}
          onCancel={() => setRemoveTarget(null)}
          busy={remove.isPending}
          error={removeError}
        />
      )}
    </SidePanel>
  );
}
