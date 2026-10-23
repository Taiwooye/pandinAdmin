"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  useRoomTypeList,
  useRoomType,
  useRoomTypeUnits,
  useUpdateRoomType,
  useDeleteRoomType,
  useUpdateRoomTypeUnitStatus,
  useAddRoomTypeUnit,
  useDeleteRoomTypeUnit,
  useUploadRoomTypeMedia,
  useDeleteRoomTypeMedia,
} from "@/hooks/queries/useRoomType";
import * as roomTypesApi from "@/services/endpoints/roomTypes";
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
  Toggle,
  TagInput,
  inputClass,
} from "@/components/ui";

// ─── Types (match AdminRoomTypeResource / AdminRoomResource / AdminMediaResource) ─

type Option = { value: string; label: string };

type Media = {
  id: number;
  url: string;
  file_name?: string;
  mime_type?: string;
  type?: Option;
  sort_order?: number;
};

type RoomUnit = {
  id: number;
  room_number: string;
  status: Option;
  room_type_id?: number;
};

type RoomType = {
  id: number;
  slug?: string;
  name: string;
  property_type?: Option;
  category: Option | string | null;
  description: string | null;
  /** Laravel decimal cast — arrives as a string like "25000.00" */
  price_per_night: string | number | null;
  price_per_week: string | number | null;
  price_per_month: string | number | null;
  max_guests: number | null;
  size_sqm: number | null;
  bedroom_count: number | null;
  features: string[] | null;
  amenities: string[] | null;
  facilities: string[] | null;
  sort_order?: number | null;
  is_featured?: boolean;
  media?: Media[];
  units?: RoomUnit[];
};

type UnitStatus = "available" | "booked" | "maintenance";

type Note = { success?: string; error?: string };

// ─── Plain-language labels ────────────────────────────────────────────────────

// Must match App\Enums\RoomCategory values
const HOTEL_CATEGORIES: Option[] = [
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "standard_plus", label: "Standard Plus" },
  { value: "deluxe", label: "Deluxe" },
  { value: "deluxe_suite", label: "Deluxe Suite" },
  { value: "executive_suite", label: "Executive Suite" },
];

// Must match App\Enums\RoomStatus values
const UNIT_STATUS: Record<UnitStatus, { label: string; option: string; tone: "green" | "red" | "amber" }> = {
  available: { label: "Free", option: "Free – ready for guests", tone: "green" },
  booked: { label: "Booked", option: "Booked – a guest is using it", tone: "red" },
  maintenance: { label: "Out of service", option: "Out of service – repairs or cleaning", tone: "amber" },
};

const PAGE_SIZE = 20; // backend paginates room types 20 at a time

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryValue(c: RoomType["category"]): string {
  if (!c) return "";
  return typeof c === "string" ? c : c.value ?? "";
}

function categoryLabel(c: RoomType["category"]): string {
  if (!c) return "";
  if (typeof c === "string") return HOTEL_CATEGORIES.find((x) => x.value === c)?.label ?? c;
  return c.label ?? c.value ?? "";
}

function toNumber(v: string | number | null | undefined): number {
  const n = typeof v === "number" ? v : parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

function naira(v: string | number | null | undefined): string {
  return `₦${toNumber(v).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function listFrom<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const d = (raw as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as T[]) : [];
}

function objectFrom<T>(raw: unknown): T | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = (raw as { data?: unknown }).data;
  if (d && typeof d === "object" && !Array.isArray(d)) return d as T;
  return raw as T;
}

function unitStatus(u: RoomUnit): UnitStatus {
  const v = u.status?.value;
  return v === "booked" || v === "maintenance" ? v : "available";
}

function isImage(m: Media): boolean {
  if (m.type?.value) return m.type.value === "image";
  return !m.mime_type || m.mime_type.startsWith("image/");
}

function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PanelTab = "rooms" | "details" | "photos";

export default function RoomsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [managing, setManaging] = useState<{ id: number; tab: PanelTab } | null>(null);

  const { data: listData, isLoading, isError } = useRoomTypeList({ property_type: "hotel", page });
  const roomTypes = listFrom<RoomType>(listData);

  // Units for every room type, using the same cache key as useRoomTypeUnits,
  // so counts refresh as soon as a room's status is changed in the panel.
  const unitQueries = useQueries({
    queries: roomTypes.map((rt) => ({
      queryKey: ["roomTypes", String(rt.id), "units"],
      queryFn: () => roomTypesApi.listUnits(String(rt.id)),
    })),
  });

  const unitsFor = (rt: RoomType): RoomUnit[] | undefined => {
    const q = unitQueries[roomTypes.indexOf(rt)];
    if (q?.data) return listFrom<RoomUnit>(q.data);
    return rt.units; // the list response already includes units
  };

  const allUnits = roomTypes.flatMap((rt) => unitsFor(rt) ?? []);
  const counts = {
    total: allUnits.length,
    available: allUnits.filter((u) => unitStatus(u) === "available").length,
    booked: allUnits.filter((u) => unitStatus(u) === "booked").length,
    maintenance: allUnits.filter((u) => unitStatus(u) === "maintenance").length,
  };

  const q = search.toLowerCase().trim();
  const filtered = !q
    ? roomTypes
    : roomTypes.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          categoryLabel(r.category).toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q) ||
          [...(r.features ?? []), ...(r.amenities ?? []), ...(r.facilities ?? [])].some((f) => f.toLowerCase().includes(q)) ||
          (unitsFor(r) ?? []).some((u) => u.room_number.toLowerCase().includes(q))
      );

  const managed = managing ? roomTypes.find((r) => r.id === managing.id) : undefined;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Hotel rooms"
        description="Your room types, their prices and which rooms are free. Open a room type to change its rooms, details or photos."
        action={
          <Button onClick={() => router.push("/dashboard/rooms/new")}>
            <span className="text-lg leading-none">+</span> Add a room type
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Rooms in total", value: counts.total, color: "text-slate-800" },
          { label: "Free right now", value: counts.available, color: "text-green-700" },
          { label: "Booked", value: counts.booked, color: "text-red-600" },
          { label: "Out of service", value: counts.maintenance, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5">
            <div className="text-sm font-semibold text-slate-600">{s.label}</div>
            <div className={`text-3xl font-bold mt-1 ${s.color}`}>{isLoading ? "–" : s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category, room number or feature"
          className={`${inputClass} pl-11 py-3`}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* List */}
      {isLoading && <LoadingState label="Loading rooms…" />}
      {isError && <ErrorState message="Could not load your rooms. Check your internet connection and refresh the page." />}

      {!isLoading && !isError && filtered.length === 0 && (
        search ? (
          <EmptyState icon="🔍" title={`No room types match "${search}"`} description="Try a different word, or clear the search." />
        ) : (
          <EmptyState
            icon="🛏️"
            title="No room types yet"
            description="Add your first room type (for example “Deluxe Suite”) and its room numbers."
            action={<Button onClick={() => router.push("/dashboard/rooms/new")}>+ Add a room type</Button>}
          />
        )
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((room) => (
            <RoomTypeCard
              key={room.id}
              room={room}
              units={unitsFor(room)}
              onOpen={(tab) => setManaging({ id: room.id, tab })}
            />
          ))}
        </div>
      )}

      {/* Pagination (backend returns 20 per page without totals) */}
      {!isLoading && !isError && (page > 1 || roomTypes.length >= PAGE_SIZE) && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-slate-500">Page {page}</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Previous
            </Button>
            <Button variant="secondary" disabled={roomTypes.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
              Next →
            </Button>
          </div>
        </div>
      )}

      {managing && managed && (
        <ManagePanel
          key={managed.id}
          roomType={managed}
          initialTab={managing.tab}
          onClose={() => setManaging(null)}
        />
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function RoomTypeCard({
  room,
  units,
  onOpen,
}: {
  room: RoomType;
  units: RoomUnit[] | undefined;
  onOpen: (tab: PanelTab) => void;
}) {
  const cover = (room.media ?? []).find(isImage);
  const total = units?.length ?? 0;
  const free = (units ?? []).filter((u) => unitStatus(u) === "available").length;

  let status: { tone: "green" | "amber" | "red" | "slate"; text: string };
  if (!units) status = { tone: "slate", text: "Checking rooms…" };
  else if (total === 0) status = { tone: "slate", text: "No room numbers added yet" };
  else if (free === 0) status = { tone: "red", text: "Fully booked" };
  else if (free < total / 2) status = { tone: "amber", text: `Only ${free} free` };
  else status = { tone: "green", text: "Rooms available" };

  return (
    <Card className="overflow-hidden flex flex-col">
      <button type="button" onClick={() => onOpen("photos")} className="relative aspect-[16/10] bg-slate-100 block w-full text-left">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <span className="text-3xl">📷</span>
            <span className="text-xs font-semibold mt-1">No photo yet – tap to add</span>
          </div>
        )}
        {room.is_featured && (
          <span className="absolute top-3 left-3">
            <Badge tone="wine">★ Featured on website</Badge>
          </span>
        )}
      </button>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-800 truncate">{room.name}</h3>
            {categoryLabel(room.category) && <p className="text-xs text-slate-500 mt-0.5">{categoryLabel(room.category)}</p>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-[#5A0E24]">{naira(room.price_per_night)}</div>
            <div className="text-xs text-slate-500">per night</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone}>{status.text}</Badge>
          {units && total > 0 && (
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{free}</span> of {plural(total, "room")} free
            </span>
          )}
        </div>

        {room.max_guests ? <p className="text-sm text-slate-600">👤 Up to {plural(room.max_guests, "guest")}</p> : null}

        <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
          <Button onClick={() => onOpen("rooms")}>Rooms &amp; availability</Button>
          <Button variant="secondary" onClick={() => onOpen("details")}>
            Edit details
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Manage panel ─────────────────────────────────────────────────────────────

function ManagePanel({ roomType, initialTab, onClose }: { roomType: RoomType; initialTab: PanelTab; onClose: () => void }) {
  const [tab, setTab] = useState<PanelTab>(initialTab);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteRoomType = useDeleteRoomType();

  const tabs: { value: PanelTab; label: string }[] = [
    { value: "rooms", label: "Rooms" },
    { value: "details", label: "Details & price" },
    { value: "photos", label: "Photos" },
  ];

  function handleDelete() {
    setDeleteError("");
    deleteRoomType.mutate(String(roomType.id), {
      onSuccess: () => {
        setConfirmDelete(false);
        onClose();
      },
      onError: (err) => setDeleteError(errorMessage(err)),
    });
  }

  const cat = categoryLabel(roomType.category);

  return (
    <>
      <SidePanel
        title={roomType.name}
        subtitle={`${cat ? `${cat} · ` : ""}${naira(roomType.price_per_night)} per night`}
        onClose={onClose}
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
              Delete this room type
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.value ? "bg-white text-[#5A0E24] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "rooms" && <RoomsTab roomTypeId={String(roomType.id)} />}
        {tab === "details" && <DetailsTab roomType={roomType} />}
        {tab === "photos" && <PhotosTab roomType={roomType} />}
      </SidePanel>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete “${roomType.name}”?`}
          message="This room type will disappear from the website and guests will no longer be able to book it. Past bookings stay in your records."
          confirmLabel="Yes, delete room type"
          onConfirm={handleDelete}
          onCancel={() => {
            setConfirmDelete(false);
            setDeleteError("");
          }}
          busy={deleteRoomType.isPending}
          error={deleteError}
        />
      )}
    </>
  );
}

// ─── Rooms (units) tab ────────────────────────────────────────────────────────

function RoomsTab({ roomTypeId }: { roomTypeId: string }) {
  const { data, isLoading, isError } = useRoomTypeUnits(roomTypeId);
  const updateStatus = useUpdateRoomTypeUnitStatus();
  const addUnit = useAddRoomTypeUnit();
  const deleteUnit = useDeleteRoomTypeUnit();
  const units = listFrom<RoomUnit>(data)
    .slice()
    .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));

  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [note, setNote] = useState<Note>({});
  const [toDelete, setToDelete] = useState<RoomUnit | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const free = units.filter((u) => unitStatus(u) === "available").length;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const rn = newRoomNumber.trim();
    if (!rn) return;
    if (rn.length > 20) return setNote({ error: "Room numbers can be at most 20 characters long." });
    if (units.some((u) => u.room_number.toLowerCase() === rn.toLowerCase()))
      return setNote({ error: `Room ${rn} is already on the list.` });
    setNote({});
    addUnit.mutate(
      // AdminRoomTypeController@addUnit (hotel): room_number (string, max 20), status (RoomStatus)
      { id: roomTypeId, payload: { room_number: rn, status: "available" } },
      {
        onSuccess: () => {
          setNewRoomNumber("");
          setNote({ success: `Room ${rn} added.` });
        },
        onError: (err) => setNote({ error: errorMessage(err) }),
      }
    );
  }

  function changeStatus(unit: RoomUnit, next: UnitStatus) {
    if (next === unitStatus(unit)) return;
    setSavingId(unit.id);
    setNote({});
    updateStatus.mutate(
      // AdminRoomTypeController@updateUnit: status (required, RoomStatus)
      { id: roomTypeId, unitId: String(unit.id), payload: { status: next } },
      {
        onSuccess: () => setNote({ success: `Room ${unit.room_number} is now marked “${UNIT_STATUS[next].label}”.` }),
        onError: (err) => setNote({ error: errorMessage(err) }),
        onSettled: () => setSavingId(null),
      }
    );
  }

  function handleDelete() {
    if (!toDelete) return;
    const rn = toDelete.room_number;
    setDeleteError("");
    deleteUnit.mutate(
      { id: roomTypeId, unitId: String(toDelete.id) },
      {
        onSuccess: () => {
          setToDelete(null);
          setNote({ success: `Room ${rn} removed.` });
        },
        onError: (err) => setDeleteError(errorMessage(err)),
      }
    );
  }

  if (isLoading) return <LoadingState label="Loading rooms…" />;
  if (isError) return <ErrorState message="Could not load the rooms for this room type. Check your internet connection and try again." />;

  return (
    <div className="space-y-5">
      <form onSubmit={handleAdd}>
        <Field label="Add a room number" hint="The number on the door, e.g. 101. Guests can book it once it's added.">
          <div className="flex gap-2">
            <TextInput
              value={newRoomNumber}
              maxLength={20}
              onChange={(e) => {
                setNewRoomNumber(e.target.value);
                setNote({});
              }}
              placeholder="e.g. 101"
            />
            <Button type="submit" disabled={!newRoomNumber.trim() || addUnit.isPending} className="shrink-0">
              {addUnit.isPending ? "Adding…" : "Add room"}
            </Button>
          </div>
        </Field>
      </form>

      <Feedback success={note.success} error={note.error} />

      {units.length === 0 ? (
        <EmptyState icon="🚪" title="No room numbers yet" description="Add the room numbers that belong to this room type above." />
      ) : (
        <div>
          <p className="text-sm text-slate-600 mb-3">
            <span className="font-semibold text-slate-800">{free}</span> of {plural(units.length, "room")} free. Change a room&apos;s
            status when a guest checks in or out, or when it needs repairs.
          </p>
          <div className="space-y-2">
            {units.map((u) => {
              const s = unitStatus(u);
              return (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="w-16 shrink-0">
                    <div className="text-xs text-slate-500">Room</div>
                    <div className="font-bold text-slate-800 truncate">{u.room_number}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Select
                      aria-label={`Status of room ${u.room_number}`}
                      value={s}
                      disabled={savingId === u.id}
                      onChange={(e) => changeStatus(u, e.target.value as UnitStatus)}
                    >
                      {(Object.keys(UNIT_STATUS) as UnitStatus[]).map((k) => (
                        <option key={k} value={k}>
                          {UNIT_STATUS[k].option}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <span className="hidden sm:block w-28 shrink-0">
                    <Badge tone={UNIT_STATUS[s].tone}>{savingId === u.id ? "Saving…" : UNIT_STATUS[s].label}</Badge>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 shrink-0"
                    onClick={() => {
                      setDeleteError("");
                      setToDelete(u);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Remove room ${toDelete.room_number}?`}
          message={`Room ${toDelete.room_number} will be removed for good and guests won't be able to book it any more. You can add it again later if you need to.`}
          confirmLabel="Yes, remove room"
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          busy={deleteUnit.isPending}
          error={deleteError}
        />
      )}
    </div>
  );
}

// ─── Details tab ──────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold uppercase tracking-wide text-[#5A0E24] mb-3">{children}</h3>;
}

function numberOrEmpty(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "";
  const n = toNumber(v);
  return n ? String(n) : "";
}

function optionalAmount(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function DetailsTab({ roomType }: { roomType: RoomType }) {
  const [name, setName] = useState(roomType.name ?? "");
  const [category, setCategory] = useState(categoryValue(roomType.category));
  const [description, setDescription] = useState(roomType.description ?? "");
  const [maxGuests, setMaxGuests] = useState(roomType.max_guests ? String(roomType.max_guests) : "");
  const [size, setSize] = useState(roomType.size_sqm ? String(roomType.size_sqm) : "");
  const [price, setPrice] = useState(numberOrEmpty(roomType.price_per_night));
  const [priceWeek, setPriceWeek] = useState(numberOrEmpty(roomType.price_per_week));
  const [priceMonth, setPriceMonth] = useState(numberOrEmpty(roomType.price_per_month));
  const [features, setFeatures] = useState<string[]>(roomType.features ?? []);
  const [amenities, setAmenities] = useState<string[]>(roomType.amenities ?? []);
  const [facilities, setFacilities] = useState<string[]>(roomType.facilities ?? []);
  const [featured, setFeatured] = useState(!!roomType.is_featured);
  const [note, setNote] = useState<Note>({});

  const updateRoomType = useUpdateRoomType();

  const knownCategory = !category || HOTEL_CATEGORIES.some((c) => c.value === category);

  function save() {
    const priceNum = parseFloat(price);
    const guestsNum = parseInt(maxGuests, 10);
    const sizeNum = size.trim() ? parseInt(size, 10) : null;

    if (!name.trim()) return setNote({ error: "Please enter a name for this room type." });
    if (!category) return setNote({ error: "Please choose a category." });
    if (!description.trim()) return setNote({ error: "Please write a short description – it is shown on the website." });
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setNote({ error: "Please enter the price per night." });
    if (!Number.isFinite(guestsNum) || guestsNum < 1) return setNote({ error: "Please enter how many guests can stay (at least 1)." });
    if (sizeNum !== null && (!Number.isFinite(sizeNum) || sizeNum < 1))
      return setNote({ error: "Room size must be a whole number, or leave it empty." });

    setNote({});
    updateRoomType.mutate(
      {
        id: String(roomType.id),
        // Field names/types follow AdminRoomTypeController@update validation
        payload: {
          name: name.trim(),
          // Only send category when it's one the backend accepts (RoomCategory enum)
          ...(knownCategory ? { category } : {}),
          description: description.trim(),
          price_per_night: priceNum,
          price_per_week: optionalAmount(priceWeek),
          price_per_month: optionalAmount(priceMonth),
          max_guests: guestsNum,
          size_sqm: sizeNum,
          features,
          amenities,
          facilities,
          is_featured: featured,
        },
      },
      {
        onSuccess: () => setNote({ success: "Changes saved. The website now shows the new details." }),
        onError: (err) => setNote({ error: errorMessage(err) }),
      }
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionTitle>Basic details</SectionTitle>
        <Field label="Name" required hint="Shown on the website, e.g. “Mandela Suite”">
          <TextInput value={name} maxLength={255} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Category" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {!category && <option value="">Choose a category</option>}
            {!knownCategory && <option value={category}>{categoryLabel(roomType.category)}</option>}
            {HOTEL_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" required hint="A short sentence guests will read, e.g. “1 king-size bed, sleeps 2”">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="How many guests can stay" required>
            <TextInput type="number" min={1} step={1} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} />
          </Field>
          <Field label="Room size (m²)" hint="Optional">
            <TextInput type="number" min={1} step={1} value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 32" />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Price</SectionTitle>
        <Field label="Price per night (₦)" required hint="Shown on the website">
          <TextInput type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 45000" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price per week (₦)" hint="Optional – leave empty if none">
            <TextInput type="number" min={0} value={priceWeek} onChange={(e) => setPriceWeek(e.target.value)} />
          </Field>
          <Field label="Price per month (₦)" hint="Optional – leave empty if none">
            <TextInput type="number" min={0} value={priceMonth} onChange={(e) => setPriceMonth(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>What&apos;s included</SectionTitle>
        <Field label="Room features" hint="Shown on the website under “Room Features”. Type one and press Enter.">
          <TagInput value={features} onChange={setFeatures} placeholder="e.g. King-size bed, then press Enter" />
        </Field>
        <Field label="In-room amenities" hint="Shown under “In-Room Amenities”, e.g. Smart TV, Fridge">
          <TagInput value={amenities} onChange={setAmenities} placeholder="e.g. Smart TV, then press Enter" />
        </Field>
        <Field label="Hotel facilities" hint="Shown under “Facilities”, e.g. Swimming pool, Gym">
          <TagInput value={facilities} onChange={setFacilities} placeholder="e.g. Swimming pool, then press Enter" />
        </Field>
      </section>

      <section className="space-y-4">
        <SectionTitle>Website</SectionTitle>
        <Toggle
          checked={featured}
          onChange={setFeatured}
          label="Feature this room type on the website"
          description="Featured rooms are highlighted to guests."
        />
      </section>

      <div className="space-y-3 pt-4 border-t border-slate-100">
        <Feedback success={note.success} error={note.error} />
        <Button onClick={save} disabled={updateRoomType.isPending} className="w-full">
          {updateRoomType.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Photos tab ───────────────────────────────────────────────────────────────

const ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // backend limit: max:102400 (KB)

function PhotosTab({ roomType }: { roomType: RoomType }) {
  const queryClient = useQueryClient();
  const id = String(roomType.id);
  // Same cache key the upload/delete hooks refresh
  const { data, isLoading } = useRoomType(id);
  const detail = objectFrom<RoomType>(data);
  const media = detail?.media ?? roomType.media ?? [];

  const upload = useUploadRoomTypeMedia();
  const remove = useDeleteRoomTypeMedia();
  const inputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [note, setNote] = useState<Note>({});
  const [toDelete, setToDelete] = useState<Media | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // Also refresh the room cards so the cover photo updates
  const refreshList = () => queryClient.invalidateQueries({ queryKey: ["roomTypes"] });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const chosen = Array.from(files);
    const valid = chosen.filter((f) => ACCEPTED_IMAGES.includes(f.type) && f.size <= MAX_UPLOAD_BYTES);
    const skipped = chosen.length - valid.length;
    if (valid.length === 0) {
      setNote({ error: "Please choose JPG, PNG or WEBP photos (each under 100 MB)." });
      return;
    }
    setNote({});
    setProgress({ done: 0, total: valid.length });
    let failed = 0;
    let lastError = "";
    for (let i = 0; i < valid.length; i++) {
      const fd = new FormData();
      fd.append("file", valid[i]); // uploadMedia validates a single required "file"
      try {
        await upload.mutateAsync({ id, formData: fd });
      } catch (err) {
        failed++;
        lastError = errorMessage(err);
      }
      setProgress({ done: i + 1, total: valid.length });
    }
    setProgress(null);
    refreshList();
    const uploaded = valid.length - failed;
    const skippedText = skipped ? ` ${plural(skipped, "file")} skipped (not a JPG/PNG/WEBP photo, or too large).` : "";
    if (failed) setNote({ error: `${uploaded} of ${plural(valid.length, "photo")} uploaded. ${lastError}${skippedText}` });
    else setNote({ success: `${plural(uploaded, "photo")} added.${skippedText}` });
  }

  function handleDelete() {
    if (!toDelete) return;
    setDeleteError("");
    remove.mutate(
      { id, mediaId: String(toDelete.id) },
      {
        onSuccess: () => {
          setToDelete(null);
          setNote({ success: "Photo removed." });
          refreshList();
        },
        onError: (err) => setDeleteError(errorMessage(err)),
      }
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-600">The first photo is the cover shown on the website. JPG, PNG or WEBP.</p>
        <Button onClick={() => inputRef.current?.click()} disabled={progress !== null} className="shrink-0">
          {progress ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : "📷 Add photos"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <Feedback success={note.success} error={note.error} />

      {isLoading && media.length === 0 ? (
        <LoadingState label="Loading photos…" />
      ) : media.length === 0 ? (
        <EmptyState
          icon="📷"
          title="No photos yet"
          description="Rooms with photos get more bookings. Add a few clear pictures of the room."
          action={<Button onClick={() => inputRef.current?.click()}>Add photos</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((m, i) => (
            <div key={m.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <div className="relative aspect-square bg-slate-100">
                {isImage(m) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.file_name ?? "Room photo"} className="w-full h-full object-cover" />
                ) : (
                  <video src={m.url} className="w-full h-full object-cover" muted />
                )}
                {i === 0 && (
                  <span className="absolute top-2 left-2">
                    <Badge tone="wine">Cover photo</Badge>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteError("");
                  setToDelete(m);
                }}
                className="w-full py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Remove this photo?"
          message="The photo will be deleted and will no longer appear on the website. This can't be undone."
          confirmLabel="Yes, remove photo"
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          busy={remove.isPending}
          error={deleteError}
        />
      )}
    </div>
  );
}
