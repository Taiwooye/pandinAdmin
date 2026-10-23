"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateRoomType, useUploadRoomTypeMedia } from "@/hooks/queries/useRoomType";
import {
  PageHeader,
  Button,
  Card,
  Badge,
  Feedback,
  errorMessage,
  ConfirmDialog,
  Field,
  TextInput,
  TextArea,
  TagInput,
} from "@/components/ui";

// ─── Types & constants ────────────────────────────────────────────────────────

type PropertyType = "hotel" | "apartment";

type Photo = { file: File; preview: string };

type Form = {
  propertyType: PropertyType;
  name: string;
  category: string;
  description: string;
  maxGuests: string;
  bedrooms: string;
  size: string;
  price: string;
  priceWeek: string;
  priceMonth: string;
  /** Hotel: room numbers (→ room_numbers). Apartment: unit count (→ unit_labels) */
  roomNumbers: string[];
  unitCount: number;
  features: string[];
  amenities: string[];
  facilities: string[];
};

// Must match App\Enums\RoomCategory
const HOTEL_CATEGORIES = [
  { label: "Basic", value: "basic" },
  { label: "Standard", value: "standard" },
  { label: "Standard Plus", value: "standard_plus" },
  { label: "Deluxe", value: "deluxe" },
  { label: "Deluxe Suite", value: "deluxe_suite" },
  { label: "Executive Suite", value: "executive_suite" },
];

// Must match App\Enums\ApartmentCategory
const APARTMENT_CATEGORIES = [
  { label: "1-Bedroom", value: "one_bedroom" },
  { label: "2-Bedroom", value: "two_bedroom" },
  { label: "3-Bedroom", value: "three_bedroom" },
  { label: "4-Bedroom", value: "four_bedroom" },
  { label: "Penthouse", value: "penthouse" },
];

const COMMON_FEATURES = [
  "24/7 Electricity Supply",
  "24/7 AC",
  "Smart TV",
  "Water Heating System",
  "Fridge",
  "Premium Lightings",
  "Mini Couch / Relaxation Area",
  "Free Wi-Fi",
  "Work Desk",
  "Wardrobe",
  "En-suite Bathroom",
  "Balcony",
  "Kitchen",
  "Washing Machine",
  "Microwave",
  "Iron & Ironing Board",
];

const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // backend: max:102400 (KB)

const EMPTY: Form = {
  propertyType: "hotel",
  name: "",
  category: "",
  description: "",
  maxGuests: "2",
  bedrooms: "1",
  size: "",
  price: "",
  priceWeek: "",
  priceMonth: "",
  roomNumbers: [],
  unitCount: 1,
  features: [],
  amenities: [],
  facilities: [],
};

// ─── Small layout pieces ──────────────────────────────────────────────────────

function Section({ number, title, hint, children }: { number: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-8 h-8 rounded-full bg-[#5A0E24] text-white text-sm font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {hint && <p className="text-sm text-slate-500 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

function ChoiceChips({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
            value === c.value ? "bg-[#5A0E24] text-white border-[#5A0E24]" : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, onChange, min, max, unit }: { value: number; onChange: (n: number) => void; min: number; max: number; unit: string }) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="secondary" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Fewer">
        −
      </Button>
      <span className="text-2xl font-bold text-[#5A0E24] min-w-[4rem] text-center">{value}</span>
      <Button variant="secondary" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="More">
        +
      </Button>
      <span className="text-sm text-slate-500">{unit}</span>
    </div>
  );
}

function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function optionalAmount(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewRoomPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoToRemove, setPhotoToRemove] = useState<number | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState<{ name: string; units: number; photos: number; failedPhotos: number; isApt: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const createRoomType = useCreateRoomType();
  const uploadMedia = useUploadRoomTypeMedia();

  const isApt = form.propertyType === "apartment";
  const categories = isApt ? APARTMENT_CATEGORIES : HOTEL_CATEGORIES;
  const set = (p: Partial<Form>) => {
    setForm((prev) => ({ ...prev, ...p }));
    setSubmitError("");
  };

  const priceNum = parseFloat(form.price) || 0;
  const unitCount = isApt ? form.unitCount : form.roomNumbers.length;

  // ── Photos ──
  function addPhotos(files: FileList | null) {
    if (!files) return;
    const chosen = Array.from(files);
    const valid = chosen.filter((f) => ACCEPTED_IMAGES.includes(f.type) && f.size <= MAX_UPLOAD_BYTES);
    const skipped = chosen.length - valid.length;
    setPhotoNote(skipped ? `${skipped} file${skipped === 1 ? " was" : "s were"} skipped – only JPG, PNG or WEBP photos under 100 MB can be used.` : "");
    const added = valid.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...added]);
  }

  function removePhoto(index: number) {
    const photo = photos[index];
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoToRemove(null);
  }

  function makeCover(index: number) {
    setPhotos((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);
  }

  // ── Room numbers (hotel) ──
  function setRoomNumbers(next: string[]) {
    const tooLong = next.find((n) => n.length > 20);
    if (tooLong) {
      setSubmitError("Room numbers can be at most 20 characters long.");
      return;
    }
    set({ roomNumbers: next });
  }

  // ── Validation ──
  function missing(): string | null {
    if (!form.name.trim()) return "Please enter a name (section 1).";
    if (!form.category) return "Please choose a category (section 1).";
    if (!form.description.trim()) return "Please write a short description (section 1).";
    const guests = parseInt(form.maxGuests, 10);
    if (!Number.isFinite(guests) || guests < 1) return "Please enter how many guests can stay – at least 1 (section 1).";
    if (isApt) {
      const beds = parseInt(form.bedrooms, 10);
      if (!Number.isFinite(beds) || beds < 1 || beds > 10) return "Please enter the number of bedrooms, between 1 and 10 (section 1).";
    }
    if (form.size.trim()) {
      const s = parseInt(form.size, 10);
      if (!Number.isFinite(s) || s < 1) return "Room size must be a whole number, or leave it empty (section 1).";
    }
    if (priceNum <= 0) return "Please enter the price per night (section 2).";
    return null;
  }

  async function handleSubmit() {
    const problem = missing();
    if (problem) {
      setSubmitError(problem);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setStatus("Saving details…");

    // Field names/types follow AdminRoomTypeController@store validation
    const base = {
      property_type: form.propertyType,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      price_per_night: priceNum,
      price_per_week: optionalAmount(form.priceWeek),
      price_per_month: optionalAmount(form.priceMonth),
      max_guests: parseInt(form.maxGuests, 10),
      size_sqm: form.size.trim() ? parseInt(form.size, 10) : null,
      features: form.features,
      amenities: form.amenities,
      facilities: form.facilities,
      sort_order: 0,
    };
    const payload = isApt
      ? {
          ...base,
          bedroom_count: parseInt(form.bedrooms, 10),
          unit_labels: Array.from({ length: form.unitCount }, (_, i) => `Unit ${i + 1}`),
        }
      : { ...base, room_numbers: form.roomNumbers };

    let newId = "";
    try {
      const result = await createRoomType.mutateAsync(payload);
      newId = String(result?.data?.id ?? result?.id ?? "");
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
      setStatus("");
      return;
    }

    // Photos are uploaded one at a time — the first becomes the cover photo
    let failedPhotos = 0;
    if (newId) {
      for (let i = 0; i < photos.length; i++) {
        setStatus(`Uploading photo ${i + 1} of ${photos.length}…`);
        const fd = new FormData();
        fd.append("file", photos[i].file);
        try {
          await uploadMedia.mutateAsync({ id: newId, formData: fd });
        } catch {
          failedPhotos++;
        }
      }
    } else {
      failedPhotos = photos.length;
    }

    setDone({ name: form.name.trim(), units: unitCount, photos: photos.length - failedPhotos, failedPhotos, isApt });
    setSubmitting(false);
    setStatus("");
  }

  function startAgain() {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    setForm(EMPTY);
    setDone(null);
    setPhotoNote("");
  }

  // ── Success screen ──
  if (done) {
    const backPath = done.isApt ? "/dashboard/apartments" : "/dashboard/rooms";
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{done.isApt ? "Apartment added!" : "Room type added!"}</h1>
        <p className="text-slate-600 text-sm mb-2">
          <span className="font-semibold text-slate-800">{done.name}</span> is now saved and will show on the website.
        </p>
        <p className="text-slate-500 text-sm mb-4">
          {done.units} {done.isApt ? "unit" : "room"}
          {done.units === 1 ? "" : "s"} · {done.photos} photo{done.photos === 1 ? "" : "s"}
        </p>
        {done.failedPhotos > 0 && (
          <p className="text-sm font-medium text-red-600 mb-4">
            {done.failedPhotos} photo{done.failedPhotos === 1 ? "" : "s"} could not be uploaded. You can add them later from the{" "}
            {done.isApt ? "Apartments" : "Hotel rooms"} page (open the room type → Photos).
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Button onClick={startAgain}>Add another</Button>
          <Button variant="secondary" onClick={() => router.push(backPath)}>
            Back to {done.isApt ? "apartments" : "hotel rooms"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="max-w-2xl mx-auto pb-10">
      <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-4">
        ← Back
      </button>
      <PageHeader
        title={isApt ? "Add an apartment" : "Add a room type"}
        description="Fill in the sections below and press “Save” at the bottom. Fields marked * are required. Everything here is shown to guests on the website."
      />

      <div className="space-y-5">
        {/* What kind */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-slate-700 mb-3">What are you adding?</p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: "hotel", title: "🏨 Hotel room", hint: "A type of hotel room, e.g. Deluxe" },
                { value: "apartment", title: "🏠 Apartment", hint: "A self-contained apartment" },
              ] as const
            ).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set({ propertyType: t.value, category: "" })}
                className={`p-4 rounded-xl border-2 text-left transition-colors ${
                  form.propertyType === t.value ? "border-[#5A0E24] bg-[#5A0E24]/5" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className={`font-semibold ${form.propertyType === t.value ? "text-[#5A0E24]" : "text-slate-700"}`}>{t.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.hint}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* 1. Basic details */}
        <Section number={1} title="Basic details">
          <Field label="Name" required hint="Shown on the website">
            <TextInput
              value={form.name}
              maxLength={255}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={isApt ? "e.g. Two Bedroom Apartment A" : "e.g. Mandela Suite"}
            />
          </Field>
          <Field label="Category" required>
            <ChoiceChips options={categories} value={form.category} onChange={(v) => set({ category: v })} />
          </Field>
          <Field label="Description" required hint="A short sentence guests will read">
            <TextArea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="e.g. 1 king-size bed, sleeps 2 adults"
            />
          </Field>
          <div className={`grid gap-4 ${isApt ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
            <Field label="How many guests can stay" required>
              <TextInput type="number" min={1} step={1} value={form.maxGuests} onChange={(e) => set({ maxGuests: e.target.value })} />
            </Field>
            {isApt && (
              <Field label="Bedrooms" required hint="1 to 10">
                <TextInput type="number" min={1} max={10} step={1} value={form.bedrooms} onChange={(e) => set({ bedrooms: e.target.value })} />
              </Field>
            )}
            <Field label="Size (m²)" hint="Optional">
              <TextInput type="number" min={1} step={1} value={form.size} onChange={(e) => set({ size: e.target.value })} placeholder="e.g. 32" />
            </Field>
          </div>
        </Section>

        {/* 2. Price */}
        <Section number={2} title="Price">
          <Field label="Price per night (₦)" required hint="Shown on the website">
            <TextInput type="number" min={0} value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="e.g. 45000" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Price per week (₦)" hint="Optional – leave empty if none">
              <TextInput type="number" min={0} value={form.priceWeek} onChange={(e) => set({ priceWeek: e.target.value })} />
            </Field>
            <Field label="Price per month (₦)" hint="Optional – leave empty if none">
              <TextInput type="number" min={0} value={form.priceMonth} onChange={(e) => set({ priceMonth: e.target.value })} />
            </Field>
          </div>
          {priceNum > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 mb-2">At the nightly price, a guest would pay:</p>
              {[
                { label: "1 night", nights: 1 },
                { label: "Weekend (2 nights)", nights: 2 },
                { label: "1 week (7 nights)", nights: 7 },
                { label: "1 month (30 nights)", nights: 30 },
              ].map(({ label, nights }) => (
                <div key={nights} className="flex justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-800">{naira(priceNum * nights)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 3. Rooms / units */}
        <Section
          number={3}
          title={isApt ? "How many units" : "Room numbers"}
          hint={isApt ? "How many of this apartment you have. Each one can be booked separately." : "The numbers on the doors of rooms of this type. You can add more later."}
        >
          {isApt ? (
            <>
              <Stepper value={form.unitCount} onChange={(n) => set({ unitCount: n })} min={0} max={50} unit={form.unitCount === 1 ? "unit" : "units"} />
              {form.unitCount > 0 && (
                <p className="text-sm text-slate-500">
                  They will be named {Array.from({ length: Math.min(form.unitCount, 3) }, (_, i) => `“Unit ${i + 1}”`).join(", ")}
                  {form.unitCount > 3 ? " and so on" : ""}.
                </p>
              )}
            </>
          ) : (
            <Field label="Room numbers" hint="Type a room number and press Enter. Add as many as you need.">
              <TagInput value={form.roomNumbers} onChange={setRoomNumbers} placeholder="e.g. 101, then press Enter" />
            </Field>
          )}
        </Section>

        {/* 4. What's included */}
        <Section number={4} title="What's included" hint="Optional. Type an item and press Enter, or tap a common one below.">
          <Field label="Room features" hint="Shown on the website under “Room Features”">
            <TagInput value={form.features} onChange={(v) => set({ features: v })} placeholder="e.g. King-size bed, then press Enter" />
          </Field>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Common features – tap to add</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_FEATURES.filter((f) => !form.features.includes(f)).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set({ features: [...form.features, f] })}
                  className="px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-xs font-medium text-slate-600 hover:border-[#5A0E24] hover:text-[#5A0E24]"
                >
                  + {f}
                </button>
              ))}
            </div>
          </div>
          <Field label="In-room amenities" hint="Shown under “In-Room Amenities”, e.g. Toiletries, Bathrobe">
            <TagInput value={form.amenities} onChange={(v) => set({ amenities: v })} placeholder="e.g. Toiletries, then press Enter" />
          </Field>
          <Field label={isApt ? "Building facilities" : "Hotel facilities"} hint="Shown under “Facilities”, e.g. Swimming pool, Gym">
            <TagInput value={form.facilities} onChange={(v) => set({ facilities: v })} placeholder="e.g. Swimming pool, then press Enter" />
          </Field>
        </Section>

        {/* 5. Photos */}
        <Section number={5} title="Photos" hint="Optional, but rooms with photos get more bookings. The first photo is the cover shown on the website.">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => fileRef.current?.click()}>📷 Add photos</Button>
            <span className="text-xs text-slate-500">JPG, PNG or WEBP. You can pick several at once.</span>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_IMAGES.join(",")}
              multiple
              className="hidden"
              onChange={(e) => {
                addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          <Feedback error={photoNote} />
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((p, i) => (
                <div key={p.preview} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <div className="relative aspect-square bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-2 left-2">
                        <Badge tone="wine">Cover photo</Badge>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => makeCover(i)}
                      className="py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      {i === 0 ? "Cover" : "Make cover"}
                    </button>
                    <button type="button" onClick={() => setPhotoToRemove(i)} className="py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Save */}
        <Card className="p-6 space-y-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{form.name.trim() || "New room type"}</span>
            {priceNum > 0 && <> · {naira(priceNum)} per night</>}
            {" · "}
            {unitCount} {isApt ? "unit" : "room"}
            {unitCount === 1 ? "" : "s"}
            {" · "}
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </p>
          {status && <p className="text-sm text-slate-500">{status}</p>}
          <Feedback error={submitError} />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="success" onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? "Saving…" : isApt ? "Save apartment" : "Save room type"}
            </Button>
            <Button variant="secondary" onClick={() => router.back()} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </Card>
      </div>

      {photoToRemove !== null && photos[photoToRemove] && (
        <ConfirmDialog
          title="Remove this photo?"
          message="It hasn't been uploaded yet, so it will simply be taken off this form. You can add it again with “Add photos”."
          confirmLabel="Yes, remove photo"
          onConfirm={() => removePhoto(photoToRemove)}
          onCancel={() => setPhotoToRemove(null)}
        />
      )}
    </div>
  );
}
