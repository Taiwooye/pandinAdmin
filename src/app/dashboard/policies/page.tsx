"use client";

import { useState } from "react";
import { usePolicyList, useUpdatePolicy } from "@/hooks/queries/usePolicy";
import {
  useDamageChargeList,
  useCreateDamageCharge,
  useUpdateDamageCharge,
  useDeleteDamageCharge,
} from "@/hooks/queries/useDamageCharge";

// ─── Types ────────────────────────────────────────────────────────────────────

type Policy = {
  id: number;
  title?: string;
  name?: string;
  type?: string | { value: string; label: string };
  content?: string;
  body?: string;
  description?: string;
  updated_at?: string;
};

type DamageCharge = {
  id: number;
  item: string;
  charge: string | number;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fromResponse<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const w = raw as { data?: unknown };
  if (Array.isArray(w.data)) return w.data as T[];
  return [];
}

function policyTitle(p: Policy): string {
  if (p.title) return p.title;
  if (p.name) return p.name;
  const t = p.type;
  if (!t) return `Policy #${p.id}`;
  if (typeof t === "string") return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return t.label ?? t.value ?? `Policy #${p.id}`;
}

function policyContent(p: Policy): string {
  return p.content ?? p.body ?? p.description ?? "";
}

function policyIcon(p: Policy): string {
  const title = policyTitle(p).toLowerCase();
  if (title.includes("cancel")) return "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z";
  if (title.includes("check-in") || title.includes("checkin")) return "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1";
  if (title.includes("check-out") || title.includes("checkout")) return "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1";
  if (title.includes("privacy")) return "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z";
  if (title.includes("payment") || title.includes("refund")) return "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
  return "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
}

function chargeAmount(c: DamageCharge): number {
  return Number(c.charge) || 0;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  // ── Policy edit state
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [editPolicyContent, setEditPolicyContent] = useState("");

  // ── Damage charge state
  const [editingCharge, setEditingCharge] = useState<DamageCharge | null>(null);
  const [chargeName_, setChargeName] = useState("");
  const [chargeAmount_, setChargeAmount] = useState("");
  const [addingCharge, setAddingCharge] = useState(false);

  // ── Data
  const { data: pRaw, isLoading: pLoading, isError: pError } = usePolicyList();
  const policies: Policy[] = fromResponse<Policy>(pRaw);

  const { data: cRaw, isLoading: cLoading, isError: cError } = useDamageChargeList();
  const charges: DamageCharge[] = fromResponse<DamageCharge>(cRaw);

  // ── Mutations
  const updatePolicy = useUpdatePolicy();
  const createCharge = useCreateDamageCharge();
  const updateCharge = useUpdateDamageCharge();
  const deleteCharge = useDeleteDamageCharge();

  // ── Policy handlers
  function openEditPolicy(p: Policy) {
    setEditingPolicy(p);
    setEditPolicyContent(policyContent(p));
  }

  function savePolicy() {
    if (!editingPolicy) return;
    updatePolicy.mutate(
      { id: String(editingPolicy.id), payload: { content: editPolicyContent, body: editPolicyContent } },
      { onSuccess: () => setEditingPolicy(null) }
    );
  }

  // ── Damage charge handlers
  function openAddCharge() {
    setChargeName(""); setChargeAmount("");
    setAddingCharge(true);
  }

  function openEditCharge(c: DamageCharge) {
    setEditingCharge(c);
    setChargeName(c.item);
    setChargeAmount(String(chargeAmount(c)));
  }

  function saveNewCharge() {
    const amount = parseInt(chargeAmount_);
    if (!chargeName_.trim() || isNaN(amount) || amount < 0) return;
    createCharge.mutate(
      { item: chargeName_.trim(), charge: amount },
      { onSuccess: () => setAddingCharge(false) }
    );
  }

  function saveEditCharge() {
    if (!editingCharge) return;
    const amount = parseInt(chargeAmount_);
    if (!chargeName_.trim() || isNaN(amount) || amount < 0) return;
    updateCharge.mutate(
      { id: String(editingCharge.id), payload: { item: chargeName_.trim(), charge: amount } },
      { onSuccess: () => setEditingCharge(null) }
    );
  }

  function removeCharge(c: DamageCharge) {
    deleteCharge.mutate(String(c.id));
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">

      {/* ══════════════════════════════════════════
          SECTION 1 – POLICIES
      ══════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-6 rounded-full bg-[#5A0E24]" />
          <h2 className="text-xl font-bold text-slate-800">Policies</h2>
        </div>
        <p className="text-slate-500 text-sm mb-6 ml-4">
          Guest-facing policies for bookings, check-in, cancellations and more.
        </p>

        {pLoading && (
          <div className="flex items-center gap-3 py-12 text-slate-400 justify-center">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading policies…</span>
          </div>
        )}

        {pError && (
          <p className="text-center text-red-500 text-sm py-10">Failed to load policies.</p>
        )}

        {!pLoading && !pError && policies.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-10">No policies found.</p>
        )}

        {!pLoading && !pError && policies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((p) => {
              const content = policyContent(p);
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#5A0E24]/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-[#5A0E24]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={policyIcon(p)} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm">{policyTitle(p)}</h3>
                      {p.updated_at && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Updated {new Date(p.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>

                  {content ? (
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-line">{content}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No content yet.</p>
                  )}

                  <button
                    onClick={() => openEditPolicy(p)}
                    className="mt-auto w-full py-2 text-sm font-semibold bg-[#5A0E24]/10 text-[#5A0E24] rounded-xl hover:bg-[#5A0E24]/20 transition-colors"
                  >
                    Edit Policy
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Visual divider ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-2">Damage &amp; Charges</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* ══════════════════════════════════════════
          SECTION 2 – DAMAGE CHARGES
      ══════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-amber-500" />
            <h2 className="text-xl font-bold text-slate-800">Damage Charges</h2>
          </div>
          <button
            onClick={openAddCharge}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Charge
          </button>
        </div>
        <p className="text-slate-500 text-sm mb-6 ml-4">
          Fees applied when guests cause property damage.
        </p>

        {cLoading && (
          <div className="flex items-center gap-3 py-12 text-slate-400 justify-center">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading charges…</span>
          </div>
        )}

        {cError && (
          <p className="text-center text-red-500 text-sm py-10">Failed to load damage charges.</p>
        )}

        {!cLoading && !cError && charges.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium">No damage charges defined yet.</p>
            <p className="text-xs mt-1">Click &ldquo;Add Charge&rdquo; to create one.</p>
          </div>
        )}

        {!cLoading && !cError && charges.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {charges.map((c) => (
                <div key={c.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{c.item}</p>
                    {c.sort_order !== undefined && (
                      <p className="text-xs text-slate-400 mt-0.5">#{c.sort_order}</p>
                    )}
                  </div>

                  <span className="font-bold text-amber-700 text-sm shrink-0">
                    ₦{chargeAmount(c).toLocaleString()}
                  </span>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditCharge(c)}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeCharge(c)}
                      disabled={deleteCharge.isPending}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          MODAL – Edit Policy
      ══════════════════════════════════════════ */}
      {editingPolicy && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditingPolicy(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#5A0E24]/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[#5A0E24]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={policyIcon(editingPolicy)} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{policyTitle(editingPolicy)}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Edit policy content</p>
                </div>
              </div>
              <button onClick={() => setEditingPolicy(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Policy Content</label>
              <textarea
                value={editPolicyContent}
                onChange={(e) => setEditPolicyContent(e.target.value)}
                rows={12}
                placeholder="Enter policy text…"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
              <p className="text-xs text-slate-400 mt-2">{editPolicyContent.length} characters</p>
            </div>

            <div className="px-6 pb-6 space-y-3">
              {updatePolicy.isError && <p className="text-xs text-red-500 text-center">Failed to save. Please try again.</p>}
              <div className="flex gap-2">
                <button
                  onClick={savePolicy}
                  disabled={updatePolicy.isPending || !editPolicyContent.trim()}
                  className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-50 transition-colors"
                >
                  {updatePolicy.isPending ? "Saving…" : "Save Policy"}
                </button>
                <button onClick={() => setEditingPolicy(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL – Add Damage Charge
      ══════════════════════════════════════════ */}
      {addingCharge && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAddingCharge(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Add Damage Charge</h3>
                <p className="text-xs text-slate-400">New chargeable damage item</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Item *</label>
              <input
                value={chargeName_}
                onChange={(e) => setChargeName(e.target.value)}
                placeholder="e.g. Broken Window, TV Damage"
                autoFocus
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Charge (₦) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₦</span>
                <input
                  type="number"
                  min={0}
                  value={chargeAmount_}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {createCharge.isError && <p className="text-xs text-red-500">Failed to add charge. Please try again.</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveNewCharge}
                disabled={!chargeName_.trim() || !chargeAmount_ || createCharge.isPending}
                className="flex-1 py-2.5 bg-amber-500 text-white font-semibold rounded-xl text-sm hover:bg-amber-600 disabled:opacity-40 transition-colors"
              >
                {createCharge.isPending ? "Adding…" : "Add Charge"}
              </button>
              <button onClick={() => setAddingCharge(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODAL – Edit Damage Charge
      ══════════════════════════════════════════ */}
      {editingCharge && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingCharge(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-slate-800">Edit Damage Charge</h3>
              <p className="text-xs text-slate-400 mt-0.5">{editingCharge.item}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Item</label>
              <input
                value={chargeName_}
                onChange={(e) => setChargeName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Charge (₦)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₦</span>
                <input
                  type="number"
                  min={0}
                  value={chargeAmount_}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {updateCharge.isError && <p className="text-xs text-red-500">Failed to save. Please try again.</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveEditCharge}
                disabled={!chargeName_.trim() || !chargeAmount_ || updateCharge.isPending}
                className="flex-1 py-2.5 bg-amber-500 text-white font-semibold rounded-xl text-sm hover:bg-amber-600 disabled:opacity-40"
              >
                {updateCharge.isPending ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditingCharge(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
