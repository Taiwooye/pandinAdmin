"use client";

import { useState } from "react";

type GalleryItem = { id: string; url: string; caption: string };

const initialGallery: GalleryItem[] = [
  { id: "g1", url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80", caption: "Hotel Exterior" },
  { id: "g2", url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=80", caption: "Hotel Room" },
  { id: "g3", url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80", caption: "Apartment Living Room" },
  { id: "g4", url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80", caption: "Event Hall" },
  { id: "g5", url: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&q=80", caption: "DarNis Lounge" },
  { id: "g6", url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80", caption: "Swimming Pool" },
];

export default function GalleryPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery);
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [error, setError] = useState("");

  function addPhoto() {
    if (!newUrl.trim()) { setError("Please enter an image URL."); return; }
    const id = `g${Date.now()}`;
    setGallery((prev) => [...prev, { id, url: newUrl.trim(), caption: newCaption.trim() || "Untitled" }]);
    setNewUrl("");
    setNewCaption("");
    setError("");
  }

  function removePhoto(id: string) {
    setGallery((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gallery</h1>
        <p className="text-slate-500 text-sm mt-1">Add or remove photos displayed on the website gallery.</p>
      </div>

      {/* Add photo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-slate-700 text-sm mb-4">Add New Photo</h3>
        <div className="flex gap-3 flex-wrap">
          <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Image URL (https://...)"
            className="flex-1 min-w-0 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <input value={newCaption} onChange={(e) => setNewCaption(e.target.value)} placeholder="Caption (optional)"
            className="w-48 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <button onClick={addPhoto}
            className="px-5 py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] transition-colors shrink-0">
            Add Photo
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        <p className="text-slate-400 text-xs mt-2">
          Once backend is ready, this will support direct file uploads. For now, paste any image URL.
        </p>
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gallery.map((item) => (
          <div key={item.id} className="group relative bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
            <div className="aspect-square overflow-hidden">
              <img src={item.url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div className="px-3 py-2">
              <p className="text-xs text-slate-600 font-medium truncate">{item.caption}</p>
            </div>
            <button onClick={() => removePhoto(item.id)}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600">
              Ã—
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
