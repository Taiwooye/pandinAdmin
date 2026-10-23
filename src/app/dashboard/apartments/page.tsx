"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  useAddRoomTypeUnit,
  useCreateRoomType,
  useDeleteRoomType,
  useDeleteRoomTypeMedia,
  useDeleteRoomTypeUnit,
  useRoomType,
  useRoomTypeList,
  useRoomTypeUnits,
  useUpdateRoomType,
  useUpdateRoomTypeUnitStatus,
  useUploadRoomTypeMedia,
} from "@/hooks/queries/useRoomType";
import * as roomTypesApi from "@/services/endpoints/roomTypes";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Feedback,
  Field,
  LoadingState,
  PageHeader,
  Select,
  SidePanel,
  TagInput,
  TextArea,
  TextInput,
  Toggle,
  errorMessage,
} from "@/components/ui";

// ─── Types (match AdminRoomTypeResource / AdminApartmentResource / AdminMediaResource) ──

type Labelled = { value: string; label: string };

type Media = {
  id: number;
  url: string;
  file_name?: string;
  type?: Labelled;
};

type AptUnit = {
  id: number;
  unit_label: string | null;
  status: Labelled;
  room_type_id?: number;
};

type ApartmentType = {
  id: number;
  name: string;
  category: Labelled | string | null;
  description: string | null;
  // Laravel "decimal:2" casts arrive as strings, e.g. "25000.00"
  price_per_night: string | number | null;
  price_per_week: string | number | null;
  price_per_month: string | number | null;
  max_guests: number | null;
  size_sqm: number | null;
  bedroom_count: number | null;
  features: string[] | null;
  amenities: string[] | null;
  facilities: string[] | null;
  is_featured?: boolean;
  media?: Media[];
  units?: AptUnit[];
};

type UnitStatus = "available" | "booked" | "maintenance";

// ─── Plain-language labels ────────────────────────────────────────────────────

/** Allowed values from App\Enums\ApartmentCategory */
const CATEGORIES = [
  { value: "one_bedroom", label: "1-Bedroom", bedrooms: 1 },
  { value: "two_bedroom", label: "2-Bedroom", bedrooms: 2 },
  { value: "three_bedroom", label: "3-Bedroom", bedrooms: 3 },
  { value: "four_bedroom", label: "4-Bedroom", bedrooms: 4 },
  { value: "penthouse", label: "Penthouse", bedrooms: 0 },
];

/** Allowed values from App\Enums\ApartmentStatus */
const UNIT_STATUS: Record<UnitStatus, { label: string; button: string; tone: "green" | "red" | "amber" }> = {
  available: { label: "Free to book", button: "Free", tone: "green" },
  booked: { label: "Booked / guest staying", button: "Booked", tone: "red" },
  maintenance: { label: "Being repaired or cleaned", button: "Repairs", tone: "amber" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryValue(c: ApartmentType["category"]): string {
  if (!c) return "";
  return typeof c === "string" ? c : c.value;
}

function categoryLabel(c: ApartmentType["category"]): string {
  if (!c) return "";
  if (typeof c === "string") return CATEGORIES.find((x) => x.value === c)?.label ?? c;
  return c.label || c.value;
}

function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function naira(v: string | number | null | undefined): string {
  const n = toNumber(v);
  if (n === null) return "";
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function listFrom<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const d = (raw as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as T[]) : [];
}

/** Handles both `{ data: {...} }` (store/update) and a bare object (show) */
function objectFrom<T>(raw: unknown): T | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = (raw as { data?: unknown }).data;
  if (d && typeof d === "object" && !Array.isArray(d)) return d as T;
  return raw as T;
}

function unitName(u: AptUnit, index: number): string {
  const label = u.unit_label?.trim();
  return label || `Unit ${index + 1}`;
}

function unitStatus(u: AptUnit): UnitStatus {
  const v = u.status?.value;
  return v === "booked" || v === "maintenance" ? v : "available";
}

function photosOf(apt?: ApartmentType): Media[] {
  return (apt?.media ?? []).filter((m) => !m.type || m.type.value === "image");
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Empty text box → null, otherwise a number (backend accepts null for optional prices/size) */
function optionalNumber(s: string): number | null {
  const t = s.trim();
  return t === "" ? null : Number(t);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PanelState =
  | { mode: "create" }
  | { mode: "edit"; id: number; justCreated?: string }
  | { mode: "units"; id: number }
  | null;

export default function ApartmentsPage() {
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<PanelState>(null);
  const [toDelete, setToDelete] = useState<ApartmentType | null>(null);
  const [pageMessage, setPageMessage] = useState("");

  const { data: listData, isLoading, isError } = useRoomTypeList({ property_type: "apartment" });
  const apartments = useMemo(() => listFrom<ApartmentType>(listData), [listData]);

  // Units per apartment — same query keys the unit hooks refresh after a change
  const unitQueries = useQueries({
    queries: apartments.map((apt) => ({
      queryKey: ["roomTypes", String(apt.id), "units"],
      queryFn: () => roomTypesApi.listUnits(String(apt.id)),
    })),
  });

  const unitsByApt: Record<number, AptUnit[]> = {};
  apartments.forEach((apt, i) => {
    const q = unitQueries[i];
    unitsByApt[apt.id] = q?.data !== undefined ? listFrom<AptUnit>(q.data) : (apt.units ?? []);
  });

  const allUnits = Object.values(unitsByApt).flat();
  const totals = {
    all: allUnits.length,
    available: allUnits.filter((u) => unitStatus(u) === "available").length,
    booked: allUnits.filter((u) => unitStatus(u) === "booked").length,
    maintenance: allUnits.filter((u) => unitStatus(u) === "maintenance").length,
  };

  const q = search.toLowerCase().trim();
  const filtered = !q
    ? apartments
    : apartments.filter((a) => {
        const lists = [...(a.features ?? []), ...(a.amenities ?? []), ...(a.facilities ?? [])];
        return (
          a.name?.toLowerCase().includes(q) ||
          categoryLabel(a.category).toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q) ||
          lists.some((f) => f.toLowerCase().includes(q)) ||
          String(toNumber(a.price_per_night) ?? "").includes(q.replace(/[₦,\s]/g, ""))
        );
      });

  const deleteApt = useDeleteRoomType();

  const panelApt = panel && panel.mode !== "create" ? apartments.find((a) => a.id === panel.id) : undefined;

  const openCreate = () => {
    setPageMessage("");
    setPanel({ mode: "create" });
  };

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Apartments"
        description="Your apartments as guests see them on the website. Change prices, photos and what's included, and mark each unit as free, booked or under repair."
        action={<Button onClick={openCreate}>+ Add apartment</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Units in total", value: totals.all, color: "text-slate-800" },
          { label: "Free to book", value: totals.available, color: "text-green-700" },
          { label: "Booked now", value: totals.booked, color: "text-red-600" },
          { label: "Being repaired", value: totals.maintenance, color: "text-amber-700" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{isLoading ? "—" : s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="mb-5">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, type, price or something included (e.g. Wi-Fi)…"
          className="sm:max-w-md"
        />
      </div>

      {pageMessage && (
        <div className="mb-4">
          <Feedback success={pageMessage} />
        </div>
      )}

      {isLoading && <LoadingState label="Loading apartments…" />}
      {isError && <ErrorState message="Could not load apartments. Check your internet connection and refresh the page." />}

      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          icon="🏠"
          title={search ? `No apartments match "${search}"` : "No apartments yet"}
          description={search ? "Try a different word, or clear the search box." : "Add your first apartment so guests can see and book it."}
          action={
            search ? (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : (
              <Button onClick={openCreate}>+ Add apartment</Button>
            )
          }
        />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((apt) => (
            <ApartmentCard
              key={apt.id}
              apt={apt}
              units={unitsByApt[apt.id] ?? []}
              onEdit={() => {
                setPageMessage("");
                setPanel({ mode: "edit", id: apt.id });
              }}
              onUnits={() => {
                setPageMessage("");
                setPanel({ mode: "units", id: apt.id });
              }}
              onDelete={() => {
                deleteApt.reset();
                setToDelete(apt);
              }}
            />
          ))}
        </div>
      )}

      {panel?.mode === "create" && (
        <ApartmentPanel
          onClose={() => setPanel(null)}
          onCreated={(id, msg) => setPanel({ mode: "edit", id, justCreated: msg })}
        />
      )}

      {panel?.mode === "edit" && (
        <ApartmentPanel
          key={panel.id}
          id={panel.id}
          fallback={panelApt}
          justCreated={panel.justCreated}
          onClose={() => setPanel(null)}
          onCreated={() => {}}
        />
      )}

      {panel?.mode === "units" && (
        <UnitsPanel aptId={panel.id} aptName={panelApt?.name ?? "Apartment"} onClose={() => setPanel(null)} />
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Delete "${toDelete.name}"?`}
          message="This removes the apartment from the website, together with all its units and photos. Guests will no longer be able to book it. This cannot be undone."
          confirmLabel="Yes, delete apartment"
          busy={deleteApt.isPending}
          error={deleteApt.isError ? errorMessage(deleteApt.error) : undefined}
          onCancel={() => setToDelete(null)}
          onConfirm={() =>
            deleteApt.mutate(String(toDelete.id), {
              onSuccess: () => {
                setPageMessage(`"${toDelete.name}" was deleted.`);
                setToDelete(null);
              },
            })
          }
        />
      )}
    </div>
  );
}

// ─── Apartment card ───────────────────────────────────────────────────────────

function ApartmentCard({
  apt,
  units,
  onEdit,
  onUnits,
  onDelete,
}: {
  apt: ApartmentType;
  units: AptUnit[];
  onEdit: () => void;
  onUnits: () => void;
  onDelete: () => void;
}) {
  const cover = photosOf(apt)[0]?.url;
  const free = units.filter((u) => unitStatus(u) === "available").length;
  const total = units.length;

  let status: { tone: "green" | "amber" | "red" | "slate"; text: string };
  if (total === 0) status = { tone: "slate", text: "No units added yet" };
  else if (free === 0) status = { tone: "red", text: "No units free right now" };
  else status = { tone: free < total / 2 ? "amber" : "green", text: `${free} of ${total} free to book` };

  const included = [...(apt.amenities ?? []), ...(apt.facilities ?? []), ...(apt.features ?? [])];

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative h-44 bg-slate-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={apt.name} className="w-full h-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm hover:bg-slate-200/60"
          >
            <span className="text-3xl mb-1">📷</span>
            No photo yet — click to add
          </button>
        )}
        {apt.is_featured && (
          <span className="absolute top-3 left-3">
            <Badge tone="wine">★ Featured</Badge>
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <h3 className="text-lg font-bold text-slate-800 leading-tight">{apt.name}</h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-sm text-slate-500">
            {categoryLabel(apt.category) && <Badge tone="wine">{categoryLabel(apt.category)}</Badge>}
            {apt.bedroom_count ? <span>🛏 {plural(apt.bedroom_count, "bedroom")}</span> : null}
            {apt.max_guests ? <span>👥 Up to {plural(apt.max_guests, "guest")}</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "per night", value: apt.price_per_night },
            { label: "per week", value: apt.price_per_week },
            { label: "per month", value: apt.price_per_month },
          ].map((p) => (
            <div key={p.label} className="rounded-xl bg-slate-50 py-2 px-1">
              <div className={`text-sm font-bold ${toNumber(p.value) !== null ? "text-slate-800" : "text-slate-300"}`}>
                {naira(p.value) || "Not set"}
              </div>
              <div className="text-xs text-slate-500">{p.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Badge tone={status.tone}>{status.text}</Badge>
          {total > 0 && <span className="text-xs text-slate-500">{plural(total, "unit")}</span>}
        </div>

        {included.length > 0 && (
          <p className="text-sm text-slate-500 line-clamp-2">
            <span className="font-semibold text-slate-600">Includes: </span>
            {included.slice(0, 6).join(" · ")}
            {included.length > 6 ? ` and ${included.length - 6} more` : ""}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Button onClick={onUnits}>Units &amp; availability</Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onEdit}>
              Edit details &amp; photos
            </Button>
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Add / edit panel ─────────────────────────────────────────────────────────

function ApartmentPanel({
  id,
  fallback,
  justCreated,
  onClose,
  onCreated,
}: {
  id?: number;
  fallback?: ApartmentType;
  justCreated?: string;
  onClose: () => void;
  onCreated: (id: number, message: string) => void;
}) {
  // Fresh copy (includes photos); refreshed after photo uploads/removals
  const detail = useRoomType(id ? String(id) : "");
  const apt = id ? (objectFrom<ApartmentType>(detail.data) ?? fallback) : undefined;

  if (id && !apt) {
    return (
      <SidePanel title="Edit apartment" onClose={onClose}>
        {detail.isError ? <ErrorState message={errorMessage(detail.error)} /> : <LoadingState label="Loading apartment…" />}
      </SidePanel>
    );
  }

  return <ApartmentForm apt={apt} justCreated={justCreated} onClose={onClose} onCreated={onCreated} />;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function ApartmentForm({
  apt,
  justCreated,
  onClose,
  onCreated,
}: {
  apt?: ApartmentType;
  justCreated?: string;
  onClose: () => void;
  onCreated: (id: number, message: string) => void;
}) {
  const isEdit = !!apt;
  const queryClient = useQueryClient();

  const [name, setName] = useState(apt?.name ?? "");
  const [category, setCategory] = useState(categoryValue(apt?.category ?? null));
  const [bedrooms, setBedrooms] = useState(apt?.bedroom_count ? String(apt.bedroom_count) : "");
  const [maxGuests, setMaxGuests] = useState(apt?.max_guests ? String(apt.max_guests) : "");
  const [size, setSize] = useState(apt?.size_sqm ? String(apt.size_sqm) : "");
  const [description, setDescription] = useState(apt?.description ?? "");
  const [priceNight, setPriceNight] = useState(toNumber(apt?.price_per_night)?.toString() ?? "");
  const [priceWeek, setPriceWeek] = useState(toNumber(apt?.price_per_week)?.toString() ?? "");
  const [priceMonth, setPriceMonth] = useState(toNumber(apt?.price_per_month)?.toString() ?? "");
  const [features, setFeatures] = useState<string[]>(apt?.features ?? []);
  const [amenities, setAmenities] = useState<string[]>(apt?.amenities ?? []);
  const [facilities, setFacilities] = useState<string[]>(apt?.facilities ?? []);
  const [featured, setFeatured] = useState(!!apt?.is_featured);
  // Only used when adding a new apartment
  const [unitLabels, setUnitLabels] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  const [problem, setProblem] = useState("");
  const [success, setSuccess] = useState(justCreated ?? "");
  const [busy, setBusy] = useState(false);

  const createApt = useCreateRoomType();
  const updateApt = useUpdateRoomType();

  function pickCategory(v: string) {
    setCategory(v);
    const c = CATEGORIES.find((x) => x.value === v);
    if (c && c.bedrooms > 0) setBedrooms(String(c.bedrooms));
  }

  function validate(): string {
    if (!name.trim()) return "Please type a name for the apartment.";
    if (!category) return "Please choose the apartment type.";
    const b = Number(bedrooms);
    if (!bedrooms.trim() || !Number.isInteger(b) || b < 1 || b > 10) return "Bedrooms must be a whole number from 1 to 10.";
    const g = Number(maxGuests);
    if (!maxGuests.trim() || !Number.isInteger(g) || g < 1) return "Please enter how many guests can stay (at least 1).";
    if (size.trim() && (!Number.isInteger(Number(size)) || Number(size) < 1)) return "Size must be a whole number of square metres.";
    if (!description.trim()) return "Please write a short description — it is shown on the website.";
    if (priceNight.trim() === "" || Number.isNaN(Number(priceNight)) || Number(priceNight) < 0) return "Please enter the price per night.";
    for (const [label, v] of [
      ["week", priceWeek],
      ["month", priceMonth],
    ] as const) {
      if (v.trim() && (Number.isNaN(Number(v)) || Number(v) < 0)) return `The price per ${label} must be a number.`;
    }
    return "";
  }

  async function save() {
    setSuccess("");
    const invalid = validate();
    if (invalid) {
      setProblem(invalid);
      return;
    }
    setProblem("");

    // Field names follow AdminRoomTypeController@store / @update validation rules
    const common = {
      name: name.trim(),
      category,
      description: description.trim(),
      price_per_night: Number(priceNight),
      price_per_week: optionalNumber(priceWeek),
      price_per_month: optionalNumber(priceMonth),
      bedroom_count: Number(bedrooms),
      max_guests: Number(maxGuests),
      size_sqm: optionalNumber(size),
      features,
      amenities,
      facilities,
    };

    if (apt) {
      updateApt.mutate(
        { id: String(apt.id), payload: { ...common, is_featured: featured } },
        {
          onSuccess: () => setSuccess("Changes saved. The website now shows the new details."),
          onError: (err) => setProblem(errorMessage(err)),
        }
      );
      return;
    }

    setBusy(true);
    try {
      const res = await createApt.mutateAsync({
        ...common,
        property_type: "apartment",
        unit_labels: unitLabels,
      });
      const created = objectFrom<ApartmentType>(res);
      if (!created?.id) {
        onClose();
        return;
      }
      // Photos go one at a time to POST /room-types/{id}/media (field "file")
      let failed = 0;
      for (const file of newPhotos) {
        const fd = new FormData();
        fd.append("file", file);
        try {
          await roomTypesApi.uploadMedia(String(created.id), fd);
        } catch {
          failed++;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["roomTypes"] });
      onCreated(
        created.id,
        failed > 0
          ? `Apartment added, but ${plural(failed, "photo")} could not be uploaded. Try adding them again below.`
          : "Apartment added. It is now shown on the website."
      );
    } catch (err) {
      setProblem(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const saving = busy || updateApt.isPending || createApt.isPending;

  return (
    <SidePanel
      title={apt ? `Edit ${apt.name}` : "Add an apartment"}
      subtitle={apt ? "Changes show on the website as soon as you save." : "Fill in the details below. Fields marked * are required."}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback success={success} error={problem} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add apartment"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {success ? "Close" : "Cancel"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-8">
        <Section title="Basic details" hint="Shown on the website">
          <Field label="Apartment name" required hint="e.g. Garden View Apartment">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select value={category} onChange={(e) => pickCategory(e.target.value)}>
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bedrooms" required hint="1 to 10">
              <TextInput type="number" min={1} max={10} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            </Field>
            <Field label="Most guests allowed" required>
              <TextInput type="number" min={1} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} />
            </Field>
            <Field label="Size (square metres)" hint="Optional">
              <TextInput type="number" min={1} value={size} onChange={(e) => setSize(e.target.value)} />
            </Field>
          </div>
          <Field label="Description" required hint="A few sentences guests will read on the website">
            <TextArea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          {isEdit && (
            <Toggle checked={featured} onChange={setFeatured} label="Featured apartment" description="Highlight this apartment on the website" />
          )}
        </Section>

        <Section title="Prices" hint="In Naira (₦). Leave weekly or monthly empty if you don't offer them.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Per night" required>
              <TextInput type="number" min={0} value={priceNight} onChange={(e) => setPriceNight(e.target.value)} placeholder="e.g. 45000" />
            </Field>
            <Field label="Per week">
              <TextInput type="number" min={0} value={priceWeek} onChange={(e) => setPriceWeek(e.target.value)} />
            </Field>
            <Field label="Per month">
              <TextInput type="number" min={0} value={priceMonth} onChange={(e) => setPriceMonth(e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="What's included" hint="Type one item and press Enter. Shown on the website.">
          <Field label="Highlights" hint="What makes it special, e.g. Balcony, City view">
            <TagInput value={features} onChange={setFeatures} />
          </Field>
          <Field label="In the apartment" hint="e.g. Kitchen, Smart TV, Washing machine">
            <TagInput value={amenities} onChange={setAmenities} />
          </Field>
          <Field label="Building facilities" hint="e.g. Free Wi-Fi, 24/7 power, Parking, Security">
            <TagInput value={facilities} onChange={setFacilities} />
          </Field>
        </Section>

        <Section title="Photos" hint="The first photo is used as the cover picture.">
          {apt ? <PhotoManager apt={apt} /> : <NewPhotoPicker files={newPhotos} onChange={setNewPhotos} />}
        </Section>

        {!isEdit && (
          <Section title="Units" hint="How many of this apartment do you have? Give each one a name, e.g. Flat 1A, Flat 1B.">
            <TagInput value={unitLabels} onChange={setUnitLabels} placeholder="Type a unit name and press Enter" />
            <p className="text-xs text-slate-500">
              {unitLabels.length === 0
                ? "You can also add units later from “Units & availability”."
                : `${plural(unitLabels.length, "unit")} will be created, all marked as free to book.`}
            </p>
          </Section>
        )}
      </div>
    </SidePanel>
  );
}

// ─── Photos ───────────────────────────────────────────────────────────────────

const ACCEPT = "image/jpeg,image/png,image/webp";

function NewPhotoPicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);

  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  return (
    <div className="space-y-3">
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((p, i) => (
            <div key={p.url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.file.name} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5">
                  <Badge tone="wine">Cover</Badge>
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(files.filter((f) => f !== p.file))}
                className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg bg-white/90 text-xs font-semibold text-red-600 hover:bg-white"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          onChange([...files, ...picked]);
          e.target.value = "";
        }}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        📷 Add photos
      </Button>
      <p className="text-xs text-slate-500">JPG, PNG or WEBP. Photos are uploaded when you click “Add apartment”.</p>
    </div>
  );
}

function PhotoManager({ apt }: { apt: ApartmentType }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const upload = useUploadRoomTypeMedia();
  const remove = useDeleteRoomTypeMedia();
  const [uploading, setUploading] = useState(0);
  const [toRemove, setToRemove] = useState<Media | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const photos = photosOf(apt);
  // The media hooks only refresh the single-apartment query; also refresh the list so card covers update
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["roomTypes"] });

  async function addFiles(files: File[]) {
    if (files.length === 0) return;
    setSuccess("");
    setError("");
    setUploading(files.length);
    let ok = 0;
    let lastError: unknown = null;
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        await upload.mutateAsync({ id: String(apt.id), formData: fd });
        ok++;
      } catch (err) {
        lastError = err;
      }
      setUploading((n) => n - 1);
    }
    await refresh();
    if (ok > 0) setSuccess(`${plural(ok, "photo")} added.`);
    if (lastError) setError(`${plural(files.length - ok, "photo")} could not be uploaded: ${errorMessage(lastError)}`);
  }

  return (
    <div className="space-y-3">
      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
          No photos yet. Guests book more when they can see the apartment.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((m, i) => (
            <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.file_name ?? `Photo ${i + 1}`} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5">
                  <Badge tone="wine">Cover</Badge>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  remove.reset();
                  setToRemove(m);
                }}
                className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg bg-white/90 text-xs font-semibold text-red-600 hover:bg-white"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          e.target.value = "";
          void addFiles(picked);
        }}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading > 0}>
        {uploading > 0 ? `Uploading… (${uploading} left)` : "📷 Add photos"}
      </Button>
      <p className="text-xs text-slate-500">JPG, PNG or WEBP. Photos are saved straight away — no need to click Save.</p>
      <Feedback success={success} error={error} />

      {toRemove && (
        <ConfirmDialog
          title="Remove this photo?"
          message="The photo will be deleted and no longer shown on the website. This cannot be undone."
          confirmLabel="Yes, remove photo"
          busy={remove.isPending}
          error={remove.isError ? errorMessage(remove.error) : undefined}
          onCancel={() => setToRemove(null)}
          onConfirm={() =>
            remove.mutate(
              { id: String(apt.id), mediaId: String(toRemove.id) },
              {
                onSuccess: async () => {
                  await refresh();
                  setToRemove(null);
                  setError("");
                  setSuccess("Photo removed.");
                },
              }
            )
          }
        />
      )}
    </div>
  );
}

// ─── Units & availability ─────────────────────────────────────────────────────

function UnitsPanel({ aptId, aptName, onClose }: { aptId: number; aptName: string; onClose: () => void }) {
  const id = String(aptId);
  const { data, isLoading, isError, error } = useRoomTypeUnits(id);
  const units = listFrom<AptUnit>(data);

  const updateStatus = useUpdateRoomTypeUnitStatus();
  const addUnit = useAddRoomTypeUnit();
  const deleteUnit = useDeleteRoomTypeUnit();

  const [newLabel, setNewLabel] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<{ unit: AptUnit; name: string } | null>(null);
  const [success, setSuccess] = useState("");
  const [problem, setProblem] = useState("");

  function setStatus(u: AptUnit, name: string, status: UnitStatus) {
    if (unitStatus(u) === status) return;
    setSuccess("");
    setProblem("");
    setPendingId(u.id);
    updateStatus.mutate(
      { id, unitId: String(u.id), payload: { status } },
      {
        onSuccess: () => setSuccess(`${name} is now marked “${UNIT_STATUS[status].label}”.`),
        onError: (err) => setProblem(errorMessage(err)),
        onSettled: () => setPendingId(null),
      }
    );
  }

  function add() {
    setSuccess("");
    setProblem("");
    const label = newLabel.trim();
    addUnit.mutate(
      { id, payload: label ? { unit_label: label, status: "available" } : { status: "available" } },
      {
        onSuccess: () => {
          setNewLabel("");
          setSuccess(`${label || "New unit"} added and marked free to book.`);
        },
        onError: (err) => setProblem(errorMessage(err)),
      }
    );
  }

  const free = units.filter((u) => unitStatus(u) === "available").length;

  return (
    <SidePanel
      title="Units & availability"
      subtitle={`${aptName} — tap a button to change what each unit is doing right now.`}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback success={success} error={problem} />
          <Button variant="secondary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      }
    >
      {isLoading && <LoadingState label="Loading units…" />}
      {isError && <ErrorState message={errorMessage(error)} />}

      {!isLoading && !isError && (
        <div className="space-y-6">
          {units.length === 0 ? (
            <EmptyState icon="🔑" title="No units yet" description="Add each physical apartment of this type below, so you can mark it free or booked." />
          ) : (
            <>
              <p className="text-sm text-slate-600">
                <span className="font-semibold">{free}</span> of {plural(units.length, "unit")} free to book.
              </p>
              <div className="space-y-3">
                {units.map((u, i) => {
                  const name = unitName(u, i);
                  const current = unitStatus(u);
                  const busy = pendingId === u.id;
                  return (
                    <div key={u.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-slate-800">{name}</p>
                          <div className="mt-1">
                            <Badge tone={UNIT_STATUS[current].tone}>{busy ? "Saving…" : UNIT_STATUS[current].label}</Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            deleteUnit.reset();
                            setToDelete({ unit: u, name });
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(UNIT_STATUS) as UnitStatus[]).map((s) => {
                          const active = current === s;
                          const activeStyle =
                            s === "available"
                              ? "bg-green-600 text-white border-green-600"
                              : s === "booked"
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-amber-500 text-white border-amber-500";
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={busy}
                              onClick={() => setStatus(u, name, s)}
                              className={`py-2 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-50 ${
                                active ? activeStyle : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {active ? "✓ " : ""}
                              {UNIT_STATUS[s].button}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <Field label="Add a unit" hint="Optional name, e.g. Flat 2B. Leave empty to number it automatically.">
              <TextInput
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  }
                }}
                maxLength={100}
              />
            </Field>
            <Button onClick={add} disabled={addUnit.isPending}>
              {addUnit.isPending ? "Adding…" : "+ Add unit"}
            </Button>
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Delete ${toDelete.name}?`}
          message="This unit will be removed for good and can no longer be booked. Use “Repairs” instead if it is only closed for a while."
          confirmLabel="Yes, delete unit"
          busy={deleteUnit.isPending}
          error={deleteUnit.isError ? errorMessage(deleteUnit.error) : undefined}
          onCancel={() => setToDelete(null)}
          onConfirm={() =>
            deleteUnit.mutate(
              { id, unitId: String(toDelete.unit.id) },
              {
                onSuccess: () => {
                  setSuccess(`${toDelete.name} was deleted.`);
                  setProblem("");
                  setToDelete(null);
                },
              }
            )
          }
        />
      )}
    </SidePanel>
  );
}
