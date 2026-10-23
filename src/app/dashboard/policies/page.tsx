"use client";

import { useEffect, useMemo, useState } from "react";
import { usePolicyList, useUpdatePolicy } from "@/hooks/queries/usePolicy";
import {
  useDamageChargeList,
  useCreateDamageCharge,
  useUpdateDamageCharge,
  useDeleteDamageCharge,
} from "@/hooks/queries/useDamageCharge";
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
} from "@/components/ui";

// ─── Types (match the backend Admin resources exactly) ────────────────────────

/** AdminPolicyResource. type is a plain string: "damage" | "refund" | "cancellation" */
type Policy = {
  id: number;
  type: string;
  title: string;
  content: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

/** AdminDamageChargeResource. charge comes back as a decimal string, e.g. "15000.00" */
type DamageCharge = {
  id: number;
  item: string;
  charge: string | number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

type Msg = { success?: string; error?: string };

// ─── Plain-language labels ────────────────────────────────────────────────────

const POLICY_INFO: Record<string, { icon: string; where: string }> = {
  damage: { icon: "🛠️", where: "Shown on the website Policies page (above the damage charges list) and on the booking page." },
  refund: { icon: "💳", where: "Shown on the website Policies page and on the booking page." },
  cancellation: { icon: "📅", where: "Shown on the website Policies page and on the booking page." },
};

const policyInfo = (p: Policy) => POLICY_INFO[p.type] ?? { icon: "📄", where: "Shown on the website Policies page." };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listFrom<T>(raw: unknown): T[] {
  const d = (raw as { data?: unknown })?.data ?? raw;
  return Array.isArray(d) ? (d as T[]) : [];
}

const bySortOrder = <T extends { id: number; sort_order: number }>(a: T, b: T) =>
  (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || a.id - b.id;

function naira(amount: number | string): string {
  const n = Number(amount) || 0;
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Accepts "15,000" or "15000.50" and returns a number, or null if it isn't a valid amount */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₦,\s]/g, "");
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}

function useAutoClear(msg: Msg, setMsg: (m: Msg) => void) {
  useEffect(() => {
    if (!msg.success) return;
    const t = setTimeout(() => setMsg({}), 4000);
    return () => clearTimeout(t);
  }, [msg.success, setMsg]);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Policies & damage charges"
        description="The rules guests read before booking (damage, refund and cancellation), and the price list for damaged items. Changes appear on the website straight away."
      />
      <PoliciesSection />
      <DamageChargesSection />
    </div>
  );
}

// ─── Guest policies ───────────────────────────────────────────────────────────

function PoliciesSection() {
  const { data, isLoading, isError } = usePolicyList();
  const policies = useMemo(() => listFrom<Policy>(data).sort(bySortOrder), [data]);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [msg, setMsg] = useState<Msg>({});
  useAutoClear(msg, setMsg);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">Guest policies</h2>
        <p className="text-sm text-slate-500 mt-0.5">Shown on the website Policies page and summarised on the booking page.</p>
      </div>

      {(msg.success || msg.error) && (
        <div className="mb-3">
          <Feedback success={msg.success} error={msg.error} />
        </div>
      )}

      {isLoading && <LoadingState label="Loading policies…" />}
      {!isLoading && isError && <ErrorState />}
      {!isLoading && !isError && policies.length === 0 && (
        <EmptyState icon="📄" title="No policies found" description="Policies are set up by the system. Please contact your technical support." />
      )}

      {!isLoading && !isError && policies.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {policies.map((p) => {
            const info = policyInfo(p);
            return (
              <Card key={p.id} className="p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-[#5A0E24]/10 flex items-center justify-center text-xl shrink-0">{info.icon}</div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 leading-snug">{p.title || "Untitled policy"}</h3>
                    {p.updated_at && <p className="text-xs text-slate-400 mt-0.5">Last changed {formatDate(p.updated_at)}</p>}
                  </div>
                </div>
                {p.content ? (
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-5 whitespace-pre-line">{p.content}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No text yet.</p>
                )}
                <p className="text-xs text-slate-400 mt-3">{info.where}</p>
                <div className="mt-auto pt-4">
                  <Button variant="secondary" className="w-full" onClick={() => setEditing(p)}>
                    Edit this policy
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <PolicyPanel
          policy={editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            setMsg({ success: m });
          }}
        />
      )}
    </section>
  );
}

function PolicyPanel({ policy, onClose, onSaved }: { policy: Policy; onClose: () => void; onSaved: (m: string) => void }) {
  const updatePolicy = useUpdatePolicy();
  const [title, setTitle] = useState(policy.title ?? "");
  const [content, setContent] = useState(policy.content ?? "");
  const [error, setError] = useState("");

  function save() {
    if (!title.trim()) return setError("Please enter a title.");
    if (!content.trim()) return setError("Please enter the policy text.");
    setError("");
    updatePolicy.mutate(
      { id: String(policy.id), payload: { title: title.trim(), content: content.trim() } },
      {
        onSuccess: () => onSaved(`"${title.trim()}" was saved.`),
        onError: (err) => setError(errorMessage(err)),
      }
    );
  }

  return (
    <SidePanel
      title="Edit policy"
      subtitle={policyInfo(policy).where}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback error={error} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={updatePolicy.isPending} className="flex-1">
              {updatePolicy.isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={updatePolicy.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Title" hint="The heading guests see, e.g. “Refund Policy”." required>
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
        </Field>
        <Field label="Policy text" hint="Write in plain sentences. Press Enter to start a new line." required>
          <TextArea rows={12} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Enter the policy text…" className="leading-relaxed" />
        </Field>
        <p className="text-xs text-slate-400 -mt-3">{content.length} characters</p>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Preview: how guests will see it</p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <span>{policyInfo(policy).icon}</span>
                {title.trim() || "Policy title"}
              </h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-line">{content.trim() || "Your policy text will appear here."}</p>
            </div>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}

// ─── Damage charges ───────────────────────────────────────────────────────────

function DamageChargesSection() {
  const { data, isLoading, isError } = useDamageChargeList();
  const charges = useMemo(() => listFrom<DamageCharge>(data).sort(bySortOrder), [data]);
  const updateCharge = useUpdateDamageCharge();
  const deleteCharge = useDeleteDamageCharge();

  const [editing, setEditing] = useState<DamageCharge | "new" | null>(null);
  const [deleting, setDeleting] = useState<DamageCharge | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [moving, setMoving] = useState(false);
  const [msg, setMsg] = useState<Msg>({});
  useAutoClear(msg, setMsg);

  const nextSortOrder = charges.reduce((max, c) => Math.max(max, Number(c.sort_order) || 0), 0) + 1;

  /** Moves a row up/down by renumbering sort_order (1, 2, 3…) for rows whose position changed */
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= charges.length) return;
    const next = [...charges];
    [next[index], next[target]] = [next[target], next[index]];
    const changes = next.map((c, i) => ({ c, order: i + 1 })).filter(({ c, order }) => Number(c.sort_order) !== order);
    setMoving(true);
    setMsg({});
    try {
      await Promise.all(changes.map(({ c, order }) => updateCharge.mutateAsync({ id: String(c.id), payload: { sort_order: order } })));
      setMsg({ success: "Order updated." });
    } catch (err) {
      setMsg({ error: errorMessage(err) });
    } finally {
      setMoving(false);
    }
  }

  function confirmDelete() {
    if (!deleting) return;
    setDeleteError("");
    deleteCharge.mutate(String(deleting.id), {
      onSuccess: () => {
        setMsg({ success: `"${deleting.item}" was removed from the price list.` });
        setDeleting(null);
      },
      onError: (err) => setDeleteError(errorMessage(err)),
    });
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Damage charges</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            The price guests pay for each damaged item. Shown as a list under the Damage Policy on the website, in the order below.
          </p>
        </div>
        <Button onClick={() => setEditing("new")} className="shrink-0">
          + Add a charge
        </Button>
      </div>

      {(msg.success || msg.error) && (
        <div className="mb-3">
          <Feedback success={msg.success} error={msg.error} />
        </div>
      )}

      {isLoading && <LoadingState label="Loading damage charges…" />}
      {!isLoading && isError && <ErrorState />}
      {!isLoading && !isError && charges.length === 0 && (
        <EmptyState
          icon="🧾"
          title="No damage charges yet"
          description="Add items like “Stained bedsheet” or “Broken TV” with the amount guests will be charged."
          action={<Button onClick={() => setEditing("new")}>+ Add a charge</Button>}
        />
      )}

      {!isLoading && !isError && charges.length > 0 && (
        <Card className="overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>Item</span>
            <span className="text-right w-32">Charge</span>
            <span className="w-[17rem]" />
          </div>
          <ul className="divide-y divide-slate-100">
            {charges.map((c, index) => (
              <li key={c.id} className="px-5 py-3.5 flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto] sm:items-center gap-2 sm:gap-4">
                <span className="font-semibold text-slate-800 text-sm">{c.item}</span>
                <span className="sm:text-right sm:w-32">
                  <Badge tone="amber">{naira(c.charge)}</Badge>
                </span>
                <div className="flex flex-wrap gap-1.5 sm:w-[17rem] sm:justify-end">
                  <Button size="sm" variant="ghost" onClick={() => move(index, -1)} disabled={moving || index === 0} title="Move up the list">
                    ↑ Up
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => move(index, 1)} disabled={moving || index === charges.length - 1} title="Move down the list">
                    ↓ Down
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(c)} disabled={moving}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setDeleteError("");
                      setDeleting(c);
                    }}
                    disabled={moving}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && (
        <ChargePanel
          charge={editing === "new" ? null : editing}
          nextSortOrder={nextSortOrder}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            setMsg({ success: m });
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Remove this charge?"
          message={`"${deleting.item}" (${naira(deleting.charge)}) will be removed from the price list on the website. This can't be undone.`}
          confirmLabel="Yes, remove it"
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={deleteCharge.isPending}
          error={deleteError}
        />
      )}
    </section>
  );
}

function ChargePanel({
  charge,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  charge: DamageCharge | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const createCharge = useCreateDamageCharge();
  const updateCharge = useUpdateDamageCharge();
  const [item, setItem] = useState(charge?.item ?? "");
  const [amount, setAmount] = useState(charge ? String(Number(charge.charge) || 0) : "");
  const [error, setError] = useState("");
  const saving = createCharge.isPending || updateCharge.isPending;
  const parsed = parseAmount(amount);

  function save() {
    if (!item.trim()) return setError("Please enter the item name.");
    if (parsed === null) return setError("Please enter the charge as a number, e.g. 15000.");
    setError("");
    const callbacks = {
      onSuccess: () => onSaved(charge ? `"${item.trim()}" was saved.` : `"${item.trim()}" was added to the price list.`),
      onError: (err: unknown) => setError(errorMessage(err)),
    };
    if (charge) {
      updateCharge.mutate({ id: String(charge.id), payload: { item: item.trim(), charge: parsed } }, callbacks);
    } else {
      createCharge.mutate({ item: item.trim(), charge: parsed, sort_order: nextSortOrder }, callbacks);
    }
  }

  return (
    <SidePanel
      title={charge ? "Edit damage charge" : "Add a damage charge"}
      subtitle="Shown in the price list under the Damage Policy on the website"
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback error={error} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : charge ? "Save changes" : "Add charge"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Item" hint="What was damaged, e.g. “Stained bedsheet” or “Broken TV remote”." required>
          <TextInput value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Stained bedsheet" maxLength={255} />
        </Field>
        <Field label="Charge (₦)" hint="Amount in Naira. Numbers only, no commas needed." required>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">₦</span>
            <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="15000" className="pl-8" />
          </div>
        </Field>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Preview: how guests will see it</p>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-700">{item.trim() || "Item name"}</span>
            <span className="font-bold text-slate-800">{parsed !== null ? naira(parsed) : "₦0"}</span>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
