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

// ─── Types ────────────────────────────────────────────────────────────────────

type ApartmentType = {
  id: number;
  name: string;
  category: string | { value: string; label: string };
  description?: string;
  room_type_desc?: string;
  price_per_night?: number;
  price?: number;
  capacity?: number;
  bedroom_count?: number; // confirmed API field
  bedrooms?: number;
  num_bedrooms?: number;
  no_of_bedrooms?: number;
  facilities?: string[] | { id: number; name: string }[];
  amenities?: string[] | { id: number; name: string }[];
};

type AptUnit = {
  id: number;
  room_number: string;
  status: { value: string; label: string };
  check_in_date?: string | null;
  check_out_date?: string | null;
  room_type_id?: number;
};

type UnitStatus = "available" | "booked" | "maintenance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(c: ApartmentType["category"]): string {
  if (!c) return "";
  if (typeof c === "string") return c;
  return c.label ?? c.value ?? "";
}

function aptPrice(a: ApartmentType): number {
  return a.price_per_night ?? a.price ?? 0;
}

function aptDesc(a: ApartmentType): string {
  return a.description ?? a.room_type_desc ?? "";
}

function facilitiesList(a: ApartmentType): string[] {
  const raw = a.facilities ?? a.amenities ?? [];
  return raw.map((f) => (typeof f === "string" ? f : f.name));
}

function isUnavailable(u: AptUnit): boolean {
  const v = u.status?.value ?? "";
  return v === "booked" || v === "maintenance";
}

function unitsFromResponse(raw: unknown): AptUnit[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as AptUnit[];
  const wrapped = raw as { data?: unknown };
  if (Array.isArray(wrapped.data)) return wrapped.data as AptUnit[];
  return [];
}

function unitLabel(u: AptUnit, index: number): string {
  const n = u.room_number?.trim();
  return `Unit ${n || index + 1}`;
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApartmentsPage() {
  const [search, setSearch] = useState("");
  const [managingId, setManagingId] = useState<number | null>(null);

  const { data: listData, isLoading, isError, error } = useRoomTypeList({ property_type: "apartment" });
  const apartments: ApartmentType[] = Array.isArray(listData)
    ? listData
    : (listData?.data ?? []);

  // Fetch units for all apartment types in parallel for real stats
  const unitQueries = useQueries({
    queries: apartments.map((apt) => ({
      queryKey: ["roomTypes", String(apt.id), "units"],
      queryFn: () => roomTypesApi.listUnits(String(apt.id)),
      enabled: apartments.length > 0,
    })),
  });

  const statsLoading = isLoading || unitQueries.some((q) => q.isLoading);

  const unitsByApt = useMemo(() => {
    const map: Record<number, AptUnit[]> = {};
    apartments.forEach((apt, i) => {
      map[apt.id] = unitsFromResponse(unitQueries[i]?.data);
    });
    return map;
  }, [apartments, unitQueries]);

  const totalUnits = Object.values(unitsByApt).reduce((s, u) => s + u.length, 0);
  const totalAvailable = Object.values(unitsByApt).reduce(
    (s, u) => s + u.filter((x) => !isUnavailable(x)).length,
    0
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return apartments;
    return apartments.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        categoryLabel(a.category).toLowerCase().includes(q) ||
        aptDesc(a).toLowerCase().includes(q) ||
        facilitiesList(a).some((f) => f.toLowerCase().includes(q)) ||
        String(aptPrice(a)).includes(q.replace(/[₦,\s]/g, ""))
    );
  }, [apartments, search]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Apartments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage unit availability, pricing, and facilities.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/rooms/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Apartment
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
          { label: "Total Units", value: totalUnits, color: "text-slate-800" },
          { label: "Available", value: totalAvailable, color: "text-green-600" },
          { label: "Booked", value: totalUnits - totalAvailable, color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{statsLoading ? "—" : value}</div>
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
          <span className="text-sm">Loading apartments…</span>
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-sm space-y-1">
          <p className="text-red-500 font-semibold">Failed to load apartments.</p>
          {error instanceof Error && (
            <p className="text-slate-400 font-mono text-xs">{error.message}</p>
          )}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="font-medium">
            {search ? `No apartments match "${search}"` : "No apartments found. Add one to get started."}
          </p>
        </div>
      )}

      {/* Apartment cards */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((apt) => {
            const units = unitsByApt[apt.id] ?? [];
            const avail = units.filter((u) => !isUnavailable(u)).length;
            const total = units.length;
            const booked = total - avail;
            const availPct = total > 0 ? (avail / total) * 100 : 0;
            const barColor = avail === 0 ? "bg-red-500" : avail < total / 2 ? "bg-amber-500" : "bg-green-500";
            const facilities = facilitiesList(apt);
            const unitsLoading = unitQueries[apartments.indexOf(apt)]?.isLoading;

            return (
              <div key={apt.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                {/* Name + price */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide leading-tight">{apt.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-semibold text-[#5A0E24] bg-[#5A0E24]/10 px-2.5 py-0.5 rounded-full">
                        {categoryLabel(apt.category)}
                      </span>
                      {apt.bedrooms && (
                        <span className="text-xs text-slate-400 font-medium">
                          {apt.bedrooms} bed{apt.bedrooms !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-lg font-bold text-amber-700">₦{aptPrice(apt).toLocaleString()}</div>
                    <div className="text-xs text-slate-400">per night</div>
                  </div>
                </div>

                {aptDesc(apt) && (
                  <p className="text-sm text-slate-500 -mt-2">
                    {aptDesc(apt)}
                    {apt.capacity ? ` · max ${apt.capacity} guests` : ""}
                  </p>
                )}

                {/* Availability bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Unit availability</span>
                    <span className="font-semibold text-slate-700">
                      {unitsLoading ? "…" : `${avail} / ${total} units`}
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
                    <span className="text-red-500 font-medium">{booked} Booked</span>
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
                  onClick={() => setManagingId(apt.id)}
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
          apt={apartments.find((a) => a.id === managingId)!}
          onClose={() => setManagingId(null)}
        />
      )}
    </div>
  );
}

// ─── Manage modal ─────────────────────────────────────────────────────────────

function ManageModal({ apt, onClose }: { apt: ApartmentType; onClose: () => void }) {
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
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-wide">{apt.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {categoryLabel(apt.category)}
              {apt.bedrooms ? ` · ${apt.bedrooms} bedroom${apt.bedrooms !== 1 ? "s" : ""}` : ""}
            </p>
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
              {t === "units" ? "Units" : "Edit Details"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "units" ? (
            <UnitsTab aptId={String(apt.id)} />
          ) : (
            <EditTab apt={apt} onSaved={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Units tab ────────────────────────────────────────────────────────────────

function UnitsTab({ aptId }: { aptId: string }) {
  const { data, isLoading, isError } = useRoomTypeUnits(aptId);
  const updateStatus = useUpdateRoomTypeUnitStatus();
  const units: AptUnit[] = unitsFromResponse(data);

  const available = units.filter((u) => u.status?.value === "available").length;

  function cycleStatus(unit: AptUnit) {
    const current = unit.status?.value ?? "available";
    const next: UnitStatus = STATUS_CYCLE[current] ?? "available";
    updateStatus.mutate({
      id: aptId,
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
  if (units.length === 0) return <p className="text-center py-10 text-slate-400 text-sm">No units found for this apartment.</p>;

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
        {units.map((u, idx) => {
          const v = u.status?.value ?? "available";
          const colors = STATUS_COLORS[v] ?? STATUS_COLORS.available;
          const label = unitLabel(u, idx);
          return (
            <button
              key={u.id}
              onClick={() => cycleStatus(u)}
              disabled={updateStatus.isPending}
              title={`${label} — ${STATUS_LABEL[v]}. Click to toggle.`}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border-2 transition-all disabled:opacity-50 ${colors.chip}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">Tap a unit to cycle: available → booked → available</p>

      {/* Detail rows */}
      <div className="space-y-2 pt-2">
        {units.map((u, idx) => {
          const v = u.status?.value ?? "available";
          const colors = STATUS_COLORS[v] ?? STATUS_COLORS.available;
          const unavailable = isUnavailable(u);
          return (
            <div key={u.id} className={`rounded-xl border-2 p-3 transition-all ${colors.row}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-sm">{unitLabel(u, idx)}</span>
                <button
                  type="button"
                  disabled={updateStatus.isPending}
                  onClick={() => cycleStatus(u)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${colors.btn}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${v === "available" ? "bg-green-500" : v === "maintenance" ? "bg-orange-500" : "bg-red-500"}`} />
                  {STATUS_LABEL[v]} — click to {unavailable ? "release" : "book"}
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

function bedroomsFromCategory(apt: ApartmentType): string {
  // bedroom_count is the confirmed API field; others are fallbacks
  const explicit = apt.bedroom_count ?? apt.bedrooms ?? apt.num_bedrooms ?? apt.no_of_bedrooms;
  if (explicit !== undefined) return String(explicit);
  // Fall back to parsing the first digit sequence from the category label
  // Handles: "1-Bedroom", "2 Bedroom", "3-bedroom", "4_bedroom", etc.
  const label = categoryLabel(apt.category);
  const match = label.match(/(\d+)/);
  return match ? match[1] : "";
}

function EditTab({ apt, onSaved }: { apt: ApartmentType; onSaved: () => void }) {
  const [price, setPrice] = useState(String(aptPrice(apt)));
  const [desc, setDesc] = useState(aptDesc(apt));
  const [capacity, setCapacity] = useState(String(apt.capacity ?? ""));
  const [bedrooms, setBedrooms] = useState(bedroomsFromCategory(apt));
  const [facilitiesStr, setFacilitiesStr] = useState(facilitiesList(apt).join(", "));

  const updateApt = useUpdateRoomType();

  function save() {
    updateApt.mutate(
      {
        id: String(apt.id),
        payload: {
          price_per_night: parseInt(price) || 0,
          description: desc,
          capacity: parseInt(capacity) || undefined,
          bedrooms: parseInt(bedrooms) || undefined,
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
          placeholder="e.g. Spacious 2-bedroom with living area"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Bedrooms</label>
          <input
            type="number"
            min={1}
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
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
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
          Facilities <span className="normal-case font-normal text-slate-400">(comma-separated)</span>
        </label>
        <textarea
          value={facilitiesStr}
          onChange={(e) => setFacilitiesStr(e.target.value)}
          rows={3}
          placeholder="e.g. Kitchen, Washing Machine, Free Wi-Fi"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
      </div>

      {updateApt.isError && (
        <p className="text-xs text-red-500">Failed to save changes. Please try again.</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={updateApt.isPending}
          className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-60 transition-colors"
        >
          {updateApt.isPending ? "Saving…" : "Save Changes"}
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
