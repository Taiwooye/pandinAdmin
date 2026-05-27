"use client";

import { useRef, useState } from "react";

type GalleryItem = { id: string; url: string; caption: string; source: "upload" | "url" };

const initialGallery: GalleryItem[] = [
  { id: "g1", url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80", caption: "Hotel Exterior", source: "url" },
  { id: "g2", url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400&q=80", caption: "Hotel Room", source: "url" },
  { id: "g3", url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80", caption: "Apartment Living Room", source: "url" },
  { id: "g4", url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&q=80", caption: "Event Hall", source: "url" },
  { id: "g5", url: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&q=80", caption: "DarNis Lounge", source: "url" },
  { id: "g6", url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80", caption: "Swimming Pool", source: "url" },
];

export default function GalleryPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>(initialGallery);
  const [urlInput, setUrlInput] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function readFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const readers: Promise<GalleryItem>[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map(
        (file) =>
          new Promise<GalleryItem>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                id: `upload-${Date.now()}-${Math.random()}`,
                url: e.target?.result as string,
                caption: file.name.replace(/\.[^.]+$/, ""),
                source: "upload",
              });
            };
            reader.readAsDataURL(file);
          })
      );
    Promise.all(readers).then((items) => {
      setGallery((prev) => [...prev, ...items]);
      setUploading(false);
    });
  }

  function addUrl() {
    if (!urlInput.trim()) { setUrlError("Enter an image URL."); return; }
    setGallery((prev) => [...prev, {
      id: `url-${Date.now()}`,
      url: urlInput.trim(),
      caption: captionInput.trim() || "Untitled",
      source: "url",
    }]);
    setUrlInput("");
    setCaptionInput("");
    setUrlError("");
  }

  function remove(id: string) {
    setGallery((prev) => prev.filter((g) => g.id !== id));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    readFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gallery</h1>
        <p className="text-slate-500 text-sm mt-1">Upload photos from your device or add by URL. Hover a photo to remove it.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* File upload */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Upload from device</h3>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? "border-[#5A0E24] bg-[#5A0E24]/5" : "border-slate-200 hover:border-[#5A0E24]/40 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => readFiles(e.target.files)}
            />
            {uploading ? (
              <p className="text-slate-500 text-sm">Uploading...</p>
            ) : (
              <>
                <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-slate-600 text-sm font-medium">Click to upload or drag & drop</p>
                <p className="text-slate-400 text-xs mt-1">PNG, JPG, WEBP — multiple files supported</p>
              </>
            )}
          </div>
        </div>

        {/* URL input */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Add by URL</h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Image URL</label>
              <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Caption</label>
              <input value={captionInput} onChange={(e) => setCaptionInput(e.target.value)}
                placeholder="e.g. Pool Area"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            {urlError && <p className="text-red-500 text-xs">{urlError}</p>}
            <button onClick={addUrl}
              className="w-full py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] transition-colors">
              Add Photo
            </button>
          </div>
        </div>
      </div>

      {/* Gallery grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">{gallery.length} photos</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.map((item) => (
            <div key={item.id} className="group relative bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
              <div className="aspect-square overflow-hidden bg-slate-100">
                <img src={item.url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/200x200?text=Error"; }} />
              </div>
              <div className="px-3 py-2 flex items-center gap-1">
                {item.source === "upload" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Uploaded file" />
                )}
                <p className="text-xs text-slate-600 font-medium truncate">{item.caption}</p>
              </div>
              <button onClick={() => remove(item.id)}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600">
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
