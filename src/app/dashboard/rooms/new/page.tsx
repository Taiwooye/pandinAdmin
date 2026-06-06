"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────

type PropertyType = "hotel" | "apartment";

interface FormData {
  // Step 1 – About
  propertyType: PropertyType;
  name: string;
  category: string;
  roomTypeDesc: string;
  capacity: number;
  bedrooms: number;
  // Step 2 – Price
  price: number;
  // Step 3 – Room Numbers
  roomNumbers: string[];
  // Step 4 – Bathrooms
  bathrooms: number;
  // Step 5 – Amenities
  facilities: string[];
  // Step 6 – Gallery
  galleryImages: string[];
  // Step 7 – Hero Image
  heroImage: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HOTEL_CATEGORIES = [
  "Basic",
  "Standard",
  "Standard Plus",
  "Deluxe",
  "Deluxe Suite",
  "Executive Suite",
];

const APARTMENT_CATEGORIES = [
  "1-Bedroom",
  "2-Bedroom",
  "3-Bedroom",
  "4-Bedroom",
  "Penthouse",
];

const PRESET_AMENITIES = [
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

const STEPS = [
  { id: 1, label: "About" },
  { id: 2, label: "Price" },
  { id: 3, label: "Room Nos." },
  { id: 4, label: "Bathrooms" },
  { id: 5, label: "Amenities" },
  { id: 6, label: "Gallery" },
  { id: 7, label: "Hero Image" },
];

const EMPTY: FormData = {
  propertyType: "hotel",
  name: "",
  category: "",
  roomTypeDesc: "",
  capacity: 2,
  bedrooms: 1,
  price: 0,
  roomNumbers: [],
  bathrooms: 1,
  facilities: [],
  galleryImages: [],
  heroImage: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── Step components ─────────────────────────────────────────────────────────

function StepAbout({ data, set }: { data: FormData; set: (p: Partial<FormData>) => void }) {
  const categories = data.propertyType === "hotel" ? HOTEL_CATEGORIES : APARTMENT_CATEGORIES;
  return (
    <div className="space-y-5">
      {/* Property type toggle */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Property Type</label>
        <div className="grid grid-cols-2 gap-3">
          {(["hotel", "apartment"] as PropertyType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set({ propertyType: t, category: "" })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                data.propertyType === t
                  ? "border-[#5A0E24] bg-[#5A0E24]/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${data.propertyType === t ? "bg-[#5A0E24]" : "bg-slate-100"}`}>
                <svg className={`w-5 h-5 ${data.propertyType === t ? "text-white" : "text-slate-400"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {t === "hotel"
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />}
                </svg>
              </div>
              <div>
                <p className={`font-semibold text-sm capitalize ${data.propertyType === t ? "text-[#5A0E24]" : "text-slate-700"}`}>{t}</p>
                <p className="text-xs text-slate-400">{t === "hotel" ? "Hotel rooms" : "Self-contained units"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room / Unit Name *</label>
        <input
          value={data.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder={data.propertyType === "hotel" ? "e.g. Mandela Suite" : "e.g. Two Bedroom Apartment A"}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category *</label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set({ category: c })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                data.category === c
                  ? "bg-[#5A0E24] text-white border-[#5A0E24]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Room type description */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Room Type Description *</label>
        <input
          value={data.roomTypeDesc}
          onChange={(e) => set({ roomTypeDesc: e.target.value })}
          placeholder="e.g. 1 King sized bed for 3 persons"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Capacity + Bedrooms */}
      <div className={`grid gap-4 ${data.propertyType === "apartment" ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Max Guests</label>
          <input
            type="number"
            min={1}
            value={data.capacity}
            onChange={(e) => set({ capacity: parseInt(e.target.value) || 1 })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {data.propertyType === "apartment" && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bedrooms</label>
            <input
              type="number"
              min={1}
              value={data.bedrooms}
              onChange={(e) => set({ bedrooms: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StepPrice({ data, set }: { data: FormData; set: (p: Partial<FormData>) => void }) {
  const formatted = data.price > 0 ? `₦${data.price.toLocaleString()}` : "";
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nightly Rate (₦) *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₦</span>
          <input
            type="number"
            min={0}
            value={data.price || ""}
            onChange={(e) => set({ price: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-right text-lg font-bold"
          />
        </div>
        {data.price > 0 && (
          <p className="text-xs text-slate-400 mt-1.5 text-right">{formatted} per night</p>
        )}
      </div>

      {/* Price previews */}
      {data.price > 0 && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Rate Summary</p>
          {[
            { label: "1 night", nights: 1 },
            { label: "Weekend (2 nights)", nights: 2 },
            { label: "Weekly (7 nights)", nights: 7 },
            { label: "Monthly (30 nights)", nights: 30 },
          ].map(({ label, nights }) => (
            <div key={nights} className="flex justify-between text-sm">
              <span className="text-slate-500">{label}</span>
              <span className="font-semibold text-slate-800">₦{(data.price * nights).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepRoomNumbers({ data, set }: { data: FormData; set: (p: Partial<FormData>) => void }) {
  const [input, setInput] = useState("");

  function add() {
    const nums = input
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s && !data.roomNumbers.includes(s));
    if (nums.length) {
      set({ roomNumbers: [...data.roomNumbers, ...nums] });
      setInput("");
    }
  }

  function remove(n: string) {
    set({ roomNumbers: data.roomNumbers.filter((r) => r !== n) });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Add Room Numbers <span className="normal-case font-normal text-slate-400">(single or comma-separated)</span>
        </label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder="e.g. 101  or  201, 202, 203"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={add}
            disabled={!input.trim()}
            className="px-4 py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] disabled:opacity-40 transition-colors shrink-0"
          >
            Add
          </button>
        </div>
      </div>

      {data.roomNumbers.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{data.roomNumbers.length} room{data.roomNumbers.length !== 1 ? "s" : ""} added</p>
            <button
              type="button"
              onClick={() => set({ roomNumbers: [] })}
              className="text-xs text-red-500 hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl min-h-16">
            {data.roomNumbers.map((n) => (
              <span key={n} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-mono font-semibold rounded-lg shadow-sm">
                {n}
                <button type="button" onClick={() => remove(n)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-400">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <p className="text-sm">No room numbers added yet</p>
          <p className="text-xs mt-0.5">Type above and press Add or Enter</p>
        </div>
      )}
    </div>
  );
}

function StepBathrooms({ data, set }: { data: FormData; set: (p: Partial<FormData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Number of Bathrooms</label>
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => set({ bathrooms: Math.max(1, data.bathrooms - 1) })}
            disabled={data.bathrooms <= 1}
            className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 text-2xl font-bold hover:bg-slate-200 disabled:opacity-30 transition-colors flex items-center justify-center"
          >
            −
          </button>
          <div className="text-center">
            <div className="text-6xl font-black text-[#5A0E24]">{data.bathrooms}</div>
            <p className="text-sm text-slate-400 mt-1">bathroom{data.bathrooms !== 1 ? "s" : ""}</p>
          </div>
          <button
            type="button"
            onClick={() => set({ bathrooms: data.bathrooms + 1 })}
            className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 text-2xl font-bold hover:bg-slate-200 transition-colors flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {/* Quick select */}
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => set({ bathrooms: n })}
            className={`w-11 h-11 rounded-xl text-sm font-bold border-2 transition-all ${
              data.bathrooms === n
                ? "border-[#5A0E24] bg-[#5A0E24] text-white"
                : "border-slate-200 text-slate-500 hover:border-slate-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* En-suite hint */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
        <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-700">You can also add &ldquo;En-suite Bathroom&rdquo; as an amenity in the next step to highlight bathroom access.</p>
      </div>
    </div>
  );
}

function StepAmenities({ data, set }: { data: FormData; set: (p: Partial<FormData>) => void }) {
  const [custom, setCustom] = useState("");

  function toggle(f: string) {
    set({
      facilities: data.facilities.includes(f)
        ? data.facilities.filter((x) => x !== f)
        : [...data.facilities, f],
    });
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (trimmed && !data.facilities.includes(trimmed)) {
      set({ facilities: [...data.facilities, trimmed] });
    }
    setCustom("");
  }

  const extras = data.facilities.filter((f) => !PRESET_AMENITIES.includes(f));

  return (
    <div className="space-y-5">
      {/* Preset */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Select Amenities</label>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_AMENITIES.map((f) => {
            const active = data.facilities.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggle(f)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                  active
                    ? "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${active ? "bg-amber-500" : "border border-slate-300"}`}>
                  {active && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Add Custom Amenity</label>
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            placeholder="e.g. Private Pool"
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.trim()}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 disabled:opacity-40 transition-colors shrink-0"
          >
            Add
          </button>
        </div>
        {extras.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {extras.map((f) => (
              <span key={f} className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-100">
                {f}
                <button type="button" onClick={() => toggle(f)} className="hover:text-red-500 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {data.facilities.length > 0 && (
        <p className="text-xs text-slate-400">{data.facilities.length} amenit{data.facilities.length === 1 ? "y" : "ies"} selected</p>
      )}
    </div>
  );
}

function StepGallery({ data, set }: { data: FormData; set: (p: Partial<FormData>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const results: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const url = await readFileAsDataURL(file);
      results.push(url);
    }
    set({ galleryImages: [...data.galleryImages, ...results] });
  }

  function remove(idx: number) {
    set({ galleryImages: data.galleryImages.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Gallery Photos</label>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition-all"
        >
          <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-semibold text-slate-500">Click to upload or drag &amp; drop</p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP — multiple files supported</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {data.galleryImages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{data.galleryImages.length} photo{data.galleryImages.length !== 1 ? "s" : ""}</p>
            <button type="button" onClick={() => set({ galleryImages: [] })} className="text-xs text-red-500 hover:underline">Clear all</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {data.galleryImages.map((src, i) => (
              <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">1st</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepHeroImage({ data, set }: { data: FormData; set: (p: Partial<FormData>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = await readFileAsDataURL(file);
    set({ heroImage: url });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hero / Featured Image</label>
        <p className="text-xs text-slate-400 mb-4">This is the main image shown on listing cards and at the top of the room page.</p>

        {data.heroImage ? (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.heroImage} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-4 py-2 bg-white text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => set({ heroImage: "" })}
                className="px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-xl hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files); }}
            className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition-all"
          >
            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-sm font-semibold text-slate-500">Click to upload hero image</p>
            <p className="text-xs text-slate-400 mt-1">Recommended: 16:9, minimum 1280×720px</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />
      </div>

      {data.heroImage && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3">
          <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-green-700 font-medium">Hero image set. You&apos;re ready to submit!</p>
        </div>
      )}
    </div>
  );
}

// ─── Review summary ───────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-slate-800 text-right">{value}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewRoomPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  function set(partial: Partial<FormData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function canAdvance() {
    if (step === 1) return data.name.trim() && data.category && data.roomTypeDesc.trim();
    if (step === 2) return data.price > 0;
    return true;
  }

  function next() {
    if (step < STEPS.length) setStep((s) => s + 1);
    else handleSubmit();
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleSubmit() {
    // In a real app: POST to API. Here we just show success.
    console.log("New room data:", data);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Room Created!</h2>
        <p className="text-slate-500 text-sm mb-2">
          <span className="font-semibold text-slate-700">{data.name}</span> ({data.category}) has been added successfully.
        </p>
        <p className="text-slate-400 text-xs mb-8">{data.roomNumbers.length} room number{data.roomNumbers.length !== 1 ? "s" : ""} · {data.facilities.length} amenit{data.facilities.length === 1 ? "y" : "ies"} · {data.galleryImages.length} gallery photo{data.galleryImages.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setData(EMPTY); setStep(1); setSubmitted(false); }}
            className="px-5 py-2.5 bg-[#5A0E24] text-white font-semibold text-sm rounded-xl hover:bg-[#921224] transition-colors"
          >
            Add Another Room
          </button>
          <button
            onClick={() => router.push("/dashboard/rooms")}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition-colors"
          >
            Back to Rooms
          </button>
        </div>
      </div>
    );
  }

  const isLast = step === STEPS.length;

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Add New Room</h1>
        <p className="text-slate-500 text-sm mt-1">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, idx) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    done
                      ? "bg-[#5A0E24] text-white"
                      : active
                      ? "bg-amber-500 text-white ring-4 ring-amber-100"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {done ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.id}
                </div>
                <span className={`text-[10px] font-semibold mt-1 hidden sm:block ${active ? "text-amber-600" : done ? "text-[#5A0E24]" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-3 transition-all ${done ? "bg-[#5A0E24]" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        {step === 1 && <StepAbout data={data} set={set} />}
        {step === 2 && <StepPrice data={data} set={set} />}
        {step === 3 && <StepRoomNumbers data={data} set={set} />}
        {step === 4 && <StepBathrooms data={data} set={set} />}
        {step === 5 && <StepAmenities data={data} set={set} />}
        {step === 6 && <StepGallery data={data} set={set} />}
        {step === 7 && <StepHeroImage data={data} set={set} />}
      </div>

      {/* Summary strip (steps 2+) */}
      {step > 1 && (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 mb-6 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
          <span><span className="font-semibold text-slate-700">{data.name || "—"}</span></span>
          {data.category && <span className="text-[#5A0E24] font-semibold">{data.category}</span>}
          {data.price > 0 && <span>₦{data.price.toLocaleString()}/night</span>}
          {data.roomNumbers.length > 0 && <span>{data.roomNumbers.length} room{data.roomNumbers.length !== 1 ? "s" : ""}</span>}
          {data.bathrooms > 0 && <span>{data.bathrooms} bath</span>}
          {data.facilities.length > 0 && <span>{data.facilities.length} amenities</span>}
          {data.galleryImages.length > 0 && <span>{data.galleryImages.length} photos</span>}
          {data.heroImage && <span className="text-green-600 font-semibold">Hero set</span>}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            className="px-5 py-3 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition-colors"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={!canAdvance()}
          className={`flex-1 py-3 font-semibold text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            isLast
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-[#5A0E24] text-white hover:bg-[#921224]"
          }`}
        >
          {isLast ? "Create Room" : `Continue to ${STEPS[step].label}`}
        </button>
      </div>
    </div>
  );
}
