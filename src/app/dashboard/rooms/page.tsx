"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  useRoomTypeList,
  useRoomTypeUnits,
  useUpdateRoomType,
  useUpdateRoomTypeUnitStatus,
} from "@/hooks/queries/useRoomType";
import * as roomTypesApi from "@/services/endpoints/roomTypes";

// ─── Types (matched to actual API response) ───────────────────────────────────

type RoomType = {
  id: number;
  name: string;
  category: string | { value: string; label: string };
  description?: string;
  room_type_desc?: string;
  price_per_night?: number;
  price?: number;
  capacity?: number;
  facilities?: string[] | { id: number; name: string }[];
  amenities?: string[] | { id: number; name: string }[];
};

// Confirmed API shape: { id, room_number, status: { value, label }, room_type_id }
type RoomUnit = {
  id: number;
  room_number: string;
  status: { value: string; label: string };
  check_in_date?: string | null;
  check_out_date?: string | null;
  room_type_id?: number;
};

type UnitStatus = "available" | "booked" | "maintenance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(c: RoomType["category"]): string {
  if (!c) return "";
  if (typeof c === "string") return c;
  return c.label ?? c.value ?? "";
}

function roomPrice(r: RoomType): number {
  return r.price_per_night ?? r.price ?? 0;
}

function roomDesc(r: RoomType): string {
  return r.description ?? r.room_type_desc ?? "";
}

function facilitiesList(r: RoomType): string[] {
  const raw = r.facilities ?? r.amenities ?? [];
  return raw.map((f) => (typeof f === "string" ? f : f.name));
}

function isUnavailable(u: RoomUnit): boolean {
  const v = u.status?.value ?? "";
  return v === "booked" || v === "maintenance";
}

function unitsFromResponse(raw: unknown): RoomUnit[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as RoomUnit[];
  const wrapped = raw as { data?: unknown };
  if (Array.isArray(wrapped.data)) return wrapped.data as RoomUnit[];
  return [];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoomsPage() {
  const [search, setSearch] = useState("");
  const [managingId, setManagingId] = useState<number | null>(null);

  const { data: listData, isLoading, isError, error } = useRoomTypeList({ property_type: "hotel" });
  const roomTypes: RoomType[] = Array.isArray(listData)
    ? listData
    : (listData?.data ?? []);

  // Fetch units for every room type in parallel — this gives us real stats
  const unitQueries = useQueries({
    queries: roomTypes.map((rt) => ({
      queryKey: ["roomTypes", String(rt.id), "units"],
      queryFn: () => roomTypesApi.listUnits(String(rt.id)),
      enabled: roomTypes.length > 0,
    })),
  });

  const statsLoading = isLoading || unitQueries.some((q) => q.isLoading);

  // Map each room type id → its fetched units (used for per-card counts too)
  const unitsByRoomType = useMemo(() => {
    const map: Record<number, RoomUnit[]> = {};
    roomTypes.forEach((rt, i) => {
      map[rt.id] = unitsFromResponse(unitQueries[i]?.data);
    });
    return map;
  }, [roomTypes, unitQueries]);

  const totalRooms = Object.values(unitsByRoomType).reduce((s, u) => s + u.length, 0);
  const totalAvailable = Object.values(unitsByRoomType).reduce(
    (s, u) => s + u.filter((x) => !isUnavailable(x)).length,
    0
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return roomTypes;
    return roomTypes.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        categoryLabel(r.category).toLowerCase().includes(q) ||
        roomDesc(r).toLowerCase().includes(q) ||
        facilitiesList(r).some((f) => f.toLowerCase().includes(q)) ||
        String(roomPrice(r)).includes(q.replace(/[₦,\s]/g, ""))
    );
  }, [roomTypes, search]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hotel Rooms</h1>
          <p className="text-slate-500 text-sm mt-1">Manage rates, availability, room numbers, and facilities.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/rooms/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Room
          </Link>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, category, facility…"
              className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Rooms", value: totalRooms, color: "text-slate-800" },
          { label: "Available", value: totalAvailable, color: "text-green-600" },
          { label: "Booked", value: totalRooms - totalAvailable, color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>
              {statsLoading ? "—" : value}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Loading / error / empty */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading rooms…</span>
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-sm space-y-1">
          <p className="text-red-500 font-semibold">Failed to load rooms.</p>
          {error instanceof Error && (
            <p className="text-slate-400 font-mono text-xs">{error.message}</p>
          )}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="font-medium">
            {search ? `No rooms match "${search}"` : "No rooms found. Add one to get started."}
          </p>
        </div>
      )}

      {/* Room cards */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((room) => {
            const units = unitsByRoomType[room.id] ?? [];
            const avail = units.filter((u) => !isUnavailable(u)).length;
            const total = units.length;
            const occupied = total - avail;
            const availPct = total > 0 ? (avail / total) * 100 : 0;
            const barColor =
              avail === 0 ? "bg-red-500" : avail < total / 2 ? "bg-amber-500" : "bg-green-500";
            const facilities = facilitiesList(room);
            const unitsLoading = unitQueries[roomTypes.indexOf(room)]?.isLoading;

            return (
              <div key={room.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                {/* Name + price */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-wide">{room.name}</h3>
                    <span className="inline-block mt-1 text-xs font-semibold text-[#5A0E24] bg-[#5A0E24]/10 px-2.5 py-0.5 rounded-full">
                      {categoryLabel(room.category)}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-xl font-bold text-amber-700">₦{roomPrice(room).toLocaleString()}</div>
                    <div className="text-xs text-slate-400">per night</div>
                  </div>
                </div>

                {roomDesc(room) && (
                  <p className="text-sm text-slate-500 -mt-2">
                    {roomDesc(room)}
                    {room.capacity ? ` · max ${room.capacity} guest${room.capacity > 1 ? "s" : ""}` : ""}
                  </p>
                )}

                {/* Availability bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Availability</span>
                    <span className="font-semibold text-slate-700">
                      {unitsLoading ? "…" : `${avail} / ${total} rooms`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${availPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-green-600 font-medium">{avail} Available</span>
                    <span className="text-red-500 font-medium">{occupied} Booked</span>
                  </div>
                </div>

                {/* Facilities */}
                {facilities.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Facilities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {facilities.map((f) => (
                        <span key={f} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded font-medium">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setManagingId(room.id)}
                  className="w-full py-2 text-sm font-semibold bg-[#5A0E24]/10 text-[#5A0E24] rounded-xl hover:bg-[#5A0E24]/20 transition-colors"
                >
                  Manage Units &amp; Edit
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Manage modal */}
      {managingId !== null && (
        <ManageModal
          roomType={roomTypes.find((r) => r.id === managingId)!}
          onClose={() => setManagingId(null)}
        />
      )}
    </div>
  );
}

// ─── Manage modal ─────────────────────────────────────────────────────────────

function ManageModal({ roomType, onClose }: { roomType: RoomType; onClose: () => void }) {
  const [tab, setTab] = useState<"units" | "edit">("units");

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-wide">{roomType.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{categoryLabel(roomType.category)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-6">
          {(["units", "edit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? "border-[#5A0E24] text-[#5A0E24]" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {t === "units" ? "Room Units" : "Edit Details"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "units" ? (
            <UnitsTab roomTypeId={String(roomType.id)} />
          ) : (
            <EditTab roomType={roomType} onSaved={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Units tab ────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<string, UnitStatus> = {
  available: "booked",
  booked: "available",
  maintenance: "available",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  booked: "Booked",
  maintenance: "Maintenance",
};

const STATUS_COLORS: Record<string, { chip: string; row: string; btn: string }> = {
  available: {
    chip: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    row: "border-green-200 bg-green-50/60",
    btn: "bg-green-100 text-green-700 hover:bg-green-200",
  },
  booked: {
    chip: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
    row: "border-red-200 bg-red-50",
    btn: "bg-red-100 text-red-600 hover:bg-red-200",
  },
  maintenance: {
    chip: "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100",
    row: "border-orange-200 bg-orange-50",
    btn: "bg-orange-100 text-orange-600 hover:bg-orange-200",
  },
};

function UnitsTab({ roomTypeId }: { roomTypeId: string }) {
  const { data, isLoading, isError } = useRoomTypeUnits(roomTypeId);
  const updateStatus = useUpdateRoomTypeUnitStatus();
  const units: RoomUnit[] = unitsFromResponse(data);

  const available = units.filter((u) => u.status?.value === "available").length;

  function cycleStatus(unit: RoomUnit) {
    const current = unit.status?.value ?? "available";
    const next: UnitStatus = STATUS_CYCLE[current] ?? "available";
    updateStatus.mutate({
      id: roomTypeId,
      unitId: String(unit.id),
      payload: { status: next },
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Loading units…</span>
      </div>
    );
  }

  if (isError) return <p className="text-center py-10 text-red-500 text-sm">Failed to load units.</p>;
  if (units.length === 0) return <p className="text-center py-10 text-slate-400 text-sm">No units found for this room type.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {units.length} unit{units.length !== 1 ? "s" : ""}
        </p>
        <span className="text-xs text-slate-400">{available} of {units.length} available</span>
      </div>

      {/* Chip overview */}
      <div className="flex flex-wrap gap-1.5">
        {units.map((u) => {
          const v = u.status?.value ?? "available";
          const colors = STATUS_COLORS[v] ?? STATUS_COLORS.available;
          return (
            <button
              key={u.id}
              onClick={() => cycleStatus(u)}
              disabled={updateStatus.isPending}
              title={`${u.room_number} — ${STATUS_LABEL[v]}. Click to toggle.`}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border-2 transition-all disabled:opacity-50 ${colors.chip}`}
            >
              {u.room_number}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">Tap a room to cycle: available → occupied → available</p>

      {/* Detail rows */}
      <div className="space-y-2 pt-2">
        {units.map((u) => {
          const v = u.status?.value ?? "available";
          const colors = STATUS_COLORS[v] ?? STATUS_COLORS.available;
          const unavailable = isUnavailable(u);
          return (
            <div key={u.id} className={`rounded-xl border-2 p-3 transition-all ${colors.row}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-700 text-sm">Room {u.room_number}</span>
                <button
                  type="button"
                  disabled={updateStatus.isPending}
                  onClick={() => cycleStatus(u)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${colors.btn}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${v === "available" ? "bg-green-500" : v === "maintenance" ? "bg-orange-500" : "bg-red-500"}`} />

                  {STATUS_LABEL[v]} — click to{unavailable ? " release" : " occupy"}
                </button>
              </div>
              {unavailable && (u.check_in_date || u.check_out_date) && (
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  {u.check_in_date && <span>Check-in: <span className="font-medium text-slate-700">{u.check_in_date}</span></span>}
                  {u.check_out_date && <span>Check-out: <span className="font-medium text-slate-700">{u.check_out_date}</span></span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Edit tab ─────────────────────────────────────────────────────────────────

function EditTab({ roomType, onSaved }: { roomType: RoomType; onSaved: () => void }) {
  const [price, setPrice] = useState(String(roomPrice(roomType)));
  const [desc, setDesc] = useState(roomDesc(roomType));
  const [capacity, setCapacity] = useState(String(roomType.capacity ?? ""));
  const [facilitiesStr, setFacilitiesStr] = useState(facilitiesList(roomType).join(", "));

  const updateRoomType = useUpdateRoomType();

  function save() {
    updateRoomType.mutate(
      {
        id: String(roomType.id),
        payload: {
          price_per_night: parseInt(price) || 0,
          description: desc,
          capacity: parseInt(capacity) || undefined,
          facilities: facilitiesStr.split(",").map((s) => s.trim()).filter(Boolean),
        },
      },
      { onSuccess: onSaved }
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Price per night (₦)</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Description</label>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="e.g. 1 King sized bed for 3 persons"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Max guests</label>
        <input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
          Facilities <span className="normal-case font-normal text-slate-400">(comma-separated)</span>
        </label>
        <textarea
          value={facilitiesStr}
          onChange={(e) => setFacilitiesStr(e.target.value)}
          rows={3}
          placeholder="e.g. 24/7 AC, Smart TV, Fridge"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
      </div>
      {updateRoomType.isError && (
        <p className="text-xs text-red-500">Failed to save changes. Please try again.</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={updateRoomType.isPending}
          className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-60 transition-colors"
        >
          {updateRoomType.isPending ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={onSaved}
          className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
