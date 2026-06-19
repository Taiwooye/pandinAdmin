"use client";

import { useState } from "react";
import {
  usePromotionList,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
} from "@/hooks/queries/usePromotion";
import {
  useFoundationProgramList,
  useCreateFoundationProgram,
  useUpdateFoundationProgram,
  useDeleteFoundationProgram,
} from "@/hooks/queries/useFoundationProgram";

// ─── Types ────────────────────────────────────────────────────────────────────

type Promotion = {
  id: number | string;
  name?: string;
  title?: string;
  description?: string;
  body?: string;
  code?: string;
  promo_code?: string;
  discount?: number | string;
  discount_percentage?: number | string;
  discount_amount?: number | string;
  type?: string | { value: string; label: string };
  start_date?: string;
  valid_from?: string;
  end_date?: string;
  valid_to?: string;
  expires_at?: string;
  image_url?: string;
  url?: string;
  is_active?: boolean;
  is_published?: boolean;
  status?: string;
};

type FoundationProgram = {
  id: number | string;
  name?: string;
  title?: string;
  description?: string;
  body?: string;
  category?: string;
  type?: string | { value: string; label: string };
  link?: string;
  website?: string;
  image_url?: string;
  url?: string;
  is_active?: boolean;
  is_published?: boolean;
  status?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fromResponse<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const w = raw as { data?: unknown };
  if (Array.isArray(w.data)) return w.data as T[];
  return [];
}

function getId(item: { id: number | string }): string { return String(item.id); }

function promoName(p: Promotion): string { return p.name ?? p.title ?? "Untitled"; }
function promoDesc(p: Promotion): string { return p.description ?? p.body ?? ""; }
function promoCode(p: Promotion): string { return p.code ?? p.promo_code ?? ""; }
function promoDiscount(p: Promotion): string {
  const d = p.discount ?? p.discount_percentage ?? p.discount_amount;
  if (!d) return "";
  const t = typeof p.type === "object" ? p.type?.value : p.type;
  return t === "fixed" || t === "amount" ? `₦${Number(d).toLocaleString()} off` : `${d}% off`;
}
function promoStart(p: Promotion): string { return p.start_date ?? p.valid_from ?? ""; }
function promoEnd(p: Promotion): string { return p.end_date ?? p.valid_to ?? p.expires_at ?? ""; }
function promoActive(p: Promotion): boolean {
  if (p.is_active !== undefined) return p.is_active;
  if (p.is_published !== undefined) return p.is_published;
  if (p.status) return p.status === "active" || p.status === "published";
  return true;
}

function progName(p: FoundationProgram): string { return p.name ?? p.title ?? "Untitled"; }
function progDesc(p: FoundationProgram): string { return p.description ?? p.body ?? ""; }
function progCategory(p: FoundationProgram): string {
  const t = p.category ?? p.type;
  if (!t) return "";
  if (typeof t === "object") return t.label ?? t.value ?? "";
  return t;
}
function progLink(p: FoundationProgram): string { return p.link ?? p.website ?? ""; }
function progActive(p: FoundationProgram): boolean {
  if (p.is_active !== undefined) return p.is_active;
  if (p.is_published !== undefined) return p.is_published;
  if (p.status) return p.status === "active" || p.status === "published";
  return true;
}

function fmtDate(d: string): string {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}

// ─── Modal state ──────────────────────────────────────────────────────────────

type Section = "promotion" | "foundation";

type ModalState = {
  open: boolean;
  section: Section;
  mode: "add" | "edit";
  promoItem: Promotion | null;
  progItem: FoundationProgram | null;
};

const CLOSED: ModalState = { open: false, section: "promotion", mode: "add", promoItem: null, progItem: null };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const [modal, setModal] = useState<ModalState>(CLOSED);
  const [formError, setFormError] = useState("");

  // Promotion form
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pCode, setPCode] = useState("");
  const [pDiscount, setPDiscount] = useState("");
  const [pType, setPType] = useState("percentage");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");
  const [pActive, setPActive] = useState(true);

  // Foundation form
  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fLink, setFLink] = useState("");
  const [fActive, setFActive] = useState(true);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ section: Section; id: string; name: string } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: promoRaw, isLoading: promoLoading, isError: promoError } = usePromotionList();
  const { data: progRaw, isLoading: progLoading, isError: progError } = useFoundationProgramList();

  const promotions: Promotion[] = fromResponse<Promotion>(promoRaw);
  const programs: FoundationProgram[] = fromResponse<FoundationProgram>(progRaw);

  const createPromo = useCreatePromotion();
  const updatePromo = useUpdatePromotion();
  const deletePromo = useDeletePromotion();
  const createProg = useCreateFoundationProgram();
  const updateProg = useUpdateFoundationProgram();
  const deleteProg = useDeleteFoundationProgram();

  const isSaving = createPromo.isPending || updatePromo.isPending || createProg.isPending || updateProg.isPending;
  const isDeleting = deletePromo.isPending || deleteProg.isPending;

  // ── Promotion modal ───────────────────────────────────────────────────────

  function openAddPromo() {
    setPName(""); setPDesc(""); setPCode(""); setPDiscount(""); setPType("percentage"); setPStart(""); setPEnd(""); setPActive(true);
    setFormError("");
    setModal({ open: true, section: "promotion", mode: "add", promoItem: null, progItem: null });
  }

  function openEditPromo(p: Promotion) {
    setPName(promoName(p)); setPDesc(promoDesc(p)); setPCode(promoCode(p));
    const d = p.discount ?? p.discount_percentage ?? p.discount_amount;
    setPDiscount(d !== undefined ? String(d) : "");
    const t = typeof p.type === "object" ? p.type?.value : p.type;
    setPType(t ?? "percentage");
    setPStart(promoStart(p)); setPEnd(promoEnd(p)); setPActive(promoActive(p));
    setFormError("");
    setModal({ open: true, section: "promotion", mode: "edit", promoItem: p, progItem: null });
  }

  // ── Foundation modal ──────────────────────────────────────────────────────

  function openAddProg() {
    setFName(""); setFDesc(""); setFCategory(""); setFLink(""); setFActive(true);
    setFormError("");
    setModal({ open: true, section: "foundation", mode: "add", promoItem: null, progItem: null });
  }

  function openEditProg(p: FoundationProgram) {
    setFName(progName(p)); setFDesc(progDesc(p)); setFCategory(progCategory(p)); setFLink(progLink(p)); setFActive(progActive(p));
    setFormError("");
    setModal({ open: true, section: "foundation", mode: "edit", promoItem: null, progItem: p });
  }

  function closeModal() { setModal(CLOSED); setFormError(""); }

  // ── Submit ────────────────────────────────────────────────────────────────

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (modal.section === "promotion") {
      if (!pName.trim()) { setFormError("Promotion name is required."); return; }
      const payload = {
        name: pName.trim(),
        description: pDesc.trim(),
        ...(pCode.trim() ? { code: pCode.trim() } : {}),
        ...(pDiscount ? { discount: Number(pDiscount), type: pType } : {}),
        ...(pStart ? { start_date: pStart } : {}),
        ...(pEnd ? { end_date: pEnd } : {}),
        is_active: pActive,
        status: pActive ? "active" : "inactive",
      };
      if (modal.mode === "add") {
        createPromo.mutate(payload, { onSuccess: closeModal, onError: (err) => setFormError(err.message || "Failed to create promotion.") });
      } else if (modal.promoItem) {
        updatePromo.mutate({ id: getId(modal.promoItem), payload }, { onSuccess: closeModal, onError: (err) => setFormError(err.message || "Failed to update promotion.") });
      }
    } else {
      if (!fName.trim()) { setFormError("Program name is required."); return; }
      const payload = {
        name: fName.trim(),
        description: fDesc.trim(),
        ...(fCategory.trim() ? { category: fCategory.trim() } : {}),
        ...(fLink.trim() ? { link: fLink.trim() } : {}),
        is_active: fActive,
        status: fActive ? "active" : "inactive",
      };
      if (modal.mode === "add") {
        createProg.mutate(payload, { onSuccess: closeModal, onError: (err) => setFormError(err.message || "Failed to create program.") });
      } else if (modal.progItem) {
        updateProg.mutate({ id: getId(modal.progItem), payload }, { onSuccess: closeModal, onError: (err) => setFormError(err.message || "Failed to update program.") });
      }
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function confirmDelete(section: Section, id: string, name: string) {
    setDeleteTarget({ section, id, name });
  }

  function executeDelete() {
    if (!deleteTarget) return;
    const cb = { onSuccess: () => setDeleteTarget(null), onError: () => setDeleteTarget(null) };
    if (deleteTarget.section === "promotion") deletePromo.mutate(deleteTarget.id, cb);
    else deleteProg.mutate(deleteTarget.id, cb);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ════════════════ PROMOTIONS ════════════════ */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Promotions</h1>
          <p className="text-slate-500 text-sm mt-1">
            {promoLoading ? "Loading…" : `${promotions.length} promotion${promotions.length !== 1 ? "s" : ""}`} · Manage offers, discounts, and promo codes.
          </p>
        </div>
        <button
          onClick={openAddPromo}
          className="flex items-center gap-2 px-4 py-2 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#4a0b1e] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Promotion
        </button>
      </div>

      {promoLoading && <LoadingSpinner label="Loading promotions…" />}
      {promoError && <SectionError message="Failed to load promotions." />}
      {!promoLoading && !promoError && promotions.length === 0 && (
        <SectionEmpty icon="tag" message='No promotions yet. Click "Add Promotion" to create one.' />
      )}

      {!promoLoading && !promoError && promotions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
          {promotions.map((p) => {
            const active = promoActive(p);
            const disc = promoDiscount(p);
            const code = promoCode(p);
            const start = promoStart(p);
            const end = promoEnd(p);
            return (
              <div key={getId(p)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-800 text-sm leading-snug">{promoName(p)}</h3>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${active ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"}`}>
                    {active ? "Active" : "Inactive"}
                  </span>
                </div>

                {promoDesc(p) && <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3">{promoDesc(p)}</p>}

                <div className="flex flex-wrap gap-2 mb-4 mt-auto">
                  {disc && (
                    <span className="flex items-center gap-1 text-xs font-bold text-[#5A0E24] bg-[#5A0E24]/8 px-2.5 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-1.687a4.5 4.5 0 00-3.75 0L8.25 21.75 4.5 20.25V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                      </svg>
                      {disc}
                    </span>
                  )}
                  {code && (
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full tracking-wider">
                      {code}
                    </span>
                  )}
                  {(start || end) && (
                    <span className="text-xs text-slate-400">
                      {start && fmtDate(start)}{start && end && " – "}{end && fmtDate(end)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-50">
                  <button onClick={() => openEditPromo(p)} className="flex-1 py-1.5 text-xs font-semibold text-[#5A0E24] border border-[#5A0E24]/20 rounded-lg hover:bg-[#5A0E24]/5 transition-colors">Edit</button>
                  <button onClick={() => confirmDelete("promotion", getId(p), promoName(p))} className="w-8 h-8 flex items-center justify-center text-slate-400 border border-slate-200 rounded-lg hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════ DIVIDER ════════════════ */}
      <div className="flex items-center gap-4 my-10">
        <div className="flex-1 h-px bg-slate-200" />
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Foundation Programs</span>
        </div>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* ════════════════ FOUNDATION PROGRAMS ════════════════ */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Foundation Programs</h2>
          <p className="text-slate-500 text-sm mt-1">
            {progLoading ? "Loading…" : `${programs.length} program${programs.length !== 1 ? "s" : ""}`} · Community and CSR initiatives by PaNDiN Group.
          </p>
        </div>
        <button
          onClick={openAddProg}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Program
        </button>
      </div>

      {progLoading && <LoadingSpinner label="Loading programs…" />}
      {progError && <SectionError message="Failed to load foundation programs." />}
      {!progLoading && !progError && programs.length === 0 && (
        <SectionEmpty icon="cube" message='No programs yet. Click "Add Program" to create one.' />
      )}

      {!progLoading && !progError && programs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((p) => {
            const active = progActive(p);
            const cat = progCategory(p);
            const link = progLink(p);
            return (
              <div key={getId(p)} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-800 text-sm leading-snug">{progName(p)}</h3>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${active ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"}`}>
                    {active ? "Active" : "Inactive"}
                  </span>
                </div>

                {cat && (
                  <span className="inline-flex self-start text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mb-2">{cat}</span>
                )}

                {progDesc(p) && <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 mb-3 flex-1">{progDesc(p)}</p>}

                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#5A0E24] hover:underline mb-3 truncate">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="truncate">{link}</span>
                  </a>
                )}

                <div className="flex gap-2 pt-3 border-t border-slate-50 mt-auto">
                  <button onClick={() => openEditProg(p)} className="flex-1 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Edit</button>
                  <button onClick={() => confirmDelete("foundation", getId(p), progName(p))} className="w-8 h-8 flex items-center justify-center text-slate-400 border border-slate-200 rounded-lg hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add/Edit modal ────────────────────────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">
                {modal.mode === "add"
                  ? modal.section === "promotion" ? "Add Promotion" : "Add Program"
                  : modal.section === "promotion" ? "Edit Promotion" : "Edit Program"}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={onSubmit} noValidate className="px-6 py-5 space-y-4">
              {modal.section === "promotion" ? (
                <>
                  <Field label="Promotion Name" required>
                    <input value={pName} onChange={(e) => { setPName(e.target.value); setFormError(""); }} placeholder="e.g. Summer Getaway Deal" className={INPUT} />
                  </Field>

                  <Field label="Description">
                    <textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} rows={3} placeholder="What does this promotion offer?" className={`${INPUT} resize-none`} />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Promo Code">
                      <input value={pCode} onChange={(e) => setPCode(e.target.value.toUpperCase())} placeholder="SUMMER25" className={`${INPUT} font-mono tracking-widest uppercase`} />
                    </Field>
                    <Field label="Discount Type">
                      <select value={pType} onChange={(e) => setPType(e.target.value)} className={INPUT}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₦)</option>
                      </select>
                    </Field>
                  </div>

                  <Field label={pType === "fixed" ? "Discount Amount (₦)" : "Discount (%)"}>
                    <input type="number" min="0" value={pDiscount} onChange={(e) => setPDiscount(e.target.value)} placeholder={pType === "fixed" ? "5000" : "20"} className={INPUT} />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Start Date">
                      <input type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} className={INPUT} />
                    </Field>
                    <Field label="End Date">
                      <input type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} className={INPUT} />
                    </Field>
                  </div>

                  <Toggle label="Active" hint="Show this promotion to guests" value={pActive} onChange={setPActive} />
                </>
              ) : (
                <>
                  <Field label="Program Name" required>
                    <input value={fName} onChange={(e) => { setFName(e.target.value); setFormError(""); }} placeholder="e.g. Youth Empowerment Initiative" className={INPUT} />
                  </Field>

                  <Field label="Description">
                    <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={4} placeholder="What is this program about?" className={`${INPUT} resize-none`} />
                  </Field>

                  <Field label="Category / Type">
                    <input value={fCategory} onChange={(e) => setFCategory(e.target.value)} placeholder="e.g. Education, Health, Environment" className={INPUT} />
                  </Field>

                  <Field label="Website / Link">
                    <input type="url" value={fLink} onChange={(e) => setFLink(e.target.value)} placeholder="https://…" className={INPUT} />
                  </Field>

                  <Toggle label="Active" hint="Show this program publicly" value={fActive} onChange={setFActive} />
                </>
              )}

              {formError && <p className="text-xs text-red-500 font-medium">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-colors ${modal.section === "promotion" ? "bg-[#5A0E24] hover:bg-[#4a0b1e]" : "bg-slate-700 hover:bg-slate-800"}`}>
                  {isSaving ? "Saving…" : modal.mode === "add" ? (modal.section === "promotion" ? "Add Promotion" : "Add Program") : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Delete {deleteTarget.section === "promotion" ? "Promotion" : "Program"}?
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              <span className="font-semibold text-slate-700">"{deleteTarget.name}"</span> will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={executeDelete} disabled={isDeleting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors">
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const INPUT = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/20 focus:border-[#5A0E24]";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      <button type="button" onClick={() => onChange(!value)} className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-[#5A0E24]" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function SectionError({ message }: { message: string }) {
  return <div className="py-10 text-center text-red-500 font-semibold text-sm">{message}</div>;
}

function SectionEmpty({ icon: _icon, message }: { icon: string; message: string }) {
  return (
    <div className="py-12 text-center text-slate-400">
      <p className="font-medium text-sm">{message}</p>
    </div>
  );
}
