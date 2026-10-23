"use client";

import { useEffect, useMemo, useState } from "react";
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
  Toggle,
} from "@/components/ui";

// ─── Types (match the backend Admin resources exactly) ────────────────────────

/** AdminPromotionResource */
type Promotion = {
  id: number;
  title: string;
  description: string;
  badge: string | null;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

/** AdminFoundationProgramResource */
type FoundationProgram = {
  id: number;
  title: string;
  description: string;
  icon: string;
  external_url: string | null;
  is_published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

type Kind = "promotion" | "program";

/** Shared shape both kinds can be shown with */
type Item = {
  id: number;
  title: string;
  description: string;
  icon: string;
  badge: string | null;
  link: string | null;
  visible: boolean;
  sort_order: number;
};

type FormState = {
  title: string;
  description: string;
  icon: string;
  badge: string;
  link: string;
  visible: boolean;
};

// ─── Plain-language copy for each kind ────────────────────────────────────────

const COPY: Record<
  Kind,
  {
    noun: string;
    sectionTitle: string;
    sectionHint: string;
    addLabel: string;
    emptyIcon: string;
    emptyTitle: string;
    emptyText: string;
    toggleLabel: string;
    defaultIcon: string;
    icons: string[];
  }
> = {
  promotion: {
    noun: "offer",
    sectionTitle: "Website offers",
    sectionHint: 'Shown on the website home page under "Special Promotions", in the order below.',
    addLabel: "Add an offer",
    emptyIcon: "🎁",
    emptyTitle: "No offers yet",
    emptyText: "Add your first offer and it will appear on the website home page.",
    toggleLabel: "Show this offer on the website",
    defaultIcon: "🎁",
    icons: ["🎁", "🏷️", "🔥", "⭐", "🎉", "🍾", "🍽️", "🍸", "🛏️", "🏨", "💑", "🌴", "☀️", "🎄", "💎", "⏰"],
  },
  program: {
    noun: "programme",
    sectionTitle: "PaNDiN Foundation programmes",
    sectionHint: "Shown on the website Foundation page, in the order below.",
    addLabel: "Add a programme",
    emptyIcon: "🤝",
    emptyTitle: "No foundation programmes yet",
    emptyText: "Add a programme and it will appear on the website Foundation page.",
    toggleLabel: "Show this programme on the website",
    defaultIcon: "🤝",
    icons: ["🤝", "❤️", "📚", "🎓", "🏥", "🌱", "👩‍👧", "🍲", "💧", "🏠", "⚽", "🙏", "🌍", "💡", "🧒", "✋"],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listFrom<T>(raw: unknown): T[] {
  const d = (raw as { data?: unknown })?.data ?? raw;
  return Array.isArray(d) ? (d as T[]) : [];
}

function bySortOrder(a: Item, b: Item) {
  return a.sort_order - b.sort_order || a.id - b.id;
}

function promotionToItem(p: Promotion): Item {
  return {
    id: p.id,
    title: p.title ?? "",
    description: p.description ?? "",
    icon: p.icon ?? "",
    badge: p.badge ?? null,
    link: null,
    visible: p.is_active !== false,
    sort_order: Number(p.sort_order) || 0,
  };
}

function programToItem(p: FoundationProgram): Item {
  return {
    id: p.id,
    title: p.title ?? "",
    description: p.description ?? "",
    icon: p.icon ?? "",
    badge: null,
    link: p.external_url ?? null,
    visible: p.is_published !== false,
    sort_order: Number(p.sort_order) || 0,
  };
}

/** Adds https:// when staff type a bare address like "www.example.org" */
function normaliseLink(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

/** Builds the exact payload each backend endpoint accepts */
function buildPayload(kind: Kind, form: FormState): Record<string, unknown> {
  const base = {
    title: form.title.trim(),
    description: form.description.trim(),
    icon: form.icon.trim(),
  };
  if (kind === "promotion") {
    return { ...base, badge: form.badge.trim() || null, is_active: form.visible };
  }
  return { ...base, external_url: normaliseLink(form.link), is_published: form.visible };
}

function visibilityPayload(kind: Kind, visible: boolean): Record<string, unknown> {
  return kind === "promotion" ? { is_active: visible } : { is_published: visible };
}

function emptyForm(kind: Kind): FormState {
  return { title: "", description: "", icon: COPY[kind].defaultIcon, badge: "", link: "", visible: true };
}

function formFromItem(item: Item): FormState {
  return {
    title: item.title,
    description: item.description,
    icon: item.icon,
    badge: item.badge ?? "",
    link: item.link ?? "",
    visible: item.visible,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Api = {
  create: (payload: unknown) => Promise<unknown>;
  update: (id: string, payload: unknown) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

export default function PromotionsPage() {
  const promoQuery = usePromotionList();
  const progQuery = useFoundationProgramList();

  const createPromo = useCreatePromotion();
  const updatePromo = useUpdatePromotion();
  const deletePromo = useDeletePromotion();
  const createProg = useCreateFoundationProgram();
  const updateProg = useUpdateFoundationProgram();
  const deleteProg = useDeleteFoundationProgram();

  const promotions = useMemo(() => listFrom<Promotion>(promoQuery.data).map(promotionToItem).sort(bySortOrder), [promoQuery.data]);
  const programs = useMemo(() => listFrom<FoundationProgram>(progQuery.data).map(programToItem).sort(bySortOrder), [progQuery.data]);

  const promoApi: Api = {
    create: (payload) => createPromo.mutateAsync(payload),
    update: (id, payload) => updatePromo.mutateAsync({ id, payload }),
    remove: (id) => deletePromo.mutateAsync(id),
  };
  const progApi: Api = {
    create: (payload) => createProg.mutateAsync(payload),
    update: (id, payload) => updateProg.mutateAsync({ id, payload }),
    remove: (id) => deleteProg.mutateAsync(id),
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Offers & foundation"
        description="Manage the special offers shown on the website home page, and the PaNDiN Foundation programmes shown on the Foundation page. Changes appear on the website straight away."
      />

      <ContentSection kind="promotion" items={promotions} isLoading={promoQuery.isLoading} isError={promoQuery.isError} api={promoApi} />

      <ContentSection kind="program" items={programs} isLoading={progQuery.isLoading} isError={progQuery.isError} api={progApi} />
    </div>
  );
}

// ─── One section (offers or programmes) ──────────────────────────────────────

function ContentSection({
  kind,
  items,
  isLoading,
  isError,
  api,
}: {
  kind: Kind;
  items: Item[];
  isLoading: boolean;
  isError: boolean;
  api: Api;
}) {
  const copy = COPY[kind];

  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ success?: string; error?: string }>({});

  // Clear the "saved" message after a few seconds
  useEffect(() => {
    if (!feedback.success) return;
    const t = setTimeout(() => setFeedback({}), 4000);
    return () => clearTimeout(t);
  }, [feedback.success]);

  async function toggleVisible(item: Item) {
    setBusyId(item.id);
    setFeedback({});
    try {
      await api.update(String(item.id), visibilityPayload(kind, !item.visible));
      setFeedback({
        success: item.visible ? `"${item.title}" is now hidden from the website.` : `"${item.title}" is now showing on the website.`,
      });
    } catch (err) {
      setFeedback({ error: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  /** Moves an item up or down by renumbering sort_order (1, 2, 3…) for every item whose position changed */
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const changes = next.map((it, i) => ({ it, order: i + 1 })).filter(({ it, order }) => it.sort_order !== order);
    setBusyId(items[index].id);
    setFeedback({});
    try {
      await Promise.all(changes.map(({ it, order }) => api.update(String(it.id), { sort_order: order })));
      setFeedback({ success: "Order updated." });
    } catch (err) {
      setFeedback({ error: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.remove(String(deleting.id));
      setFeedback({ success: `"${deleting.title}" was deleted.` });
      setDeleting(null);
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  const nextSortOrder = items.reduce((max, it) => Math.max(max, it.sort_order), 0) + 1;
  const busy = busyId !== null;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{copy.sectionTitle}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{copy.sectionHint}</p>
        </div>
        <Button onClick={() => setEditing("new")} className="shrink-0">
          + {copy.addLabel}
        </Button>
      </div>

      {(feedback.success || feedback.error) && (
        <div className="mb-3">
          <Feedback success={feedback.success} error={feedback.error} />
        </div>
      )}

      {isLoading && <LoadingState label={`Loading ${copy.sectionTitle.toLowerCase()}…`} />}
      {!isLoading && isError && <ErrorState />}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={copy.emptyIcon}
          title={copy.emptyTitle}
          description={copy.emptyText}
          action={<Button onClick={() => setEditing("new")}>+ {copy.addLabel}</Button>}
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <Card key={item.id} className={`p-5 flex flex-col ${item.visible ? "" : "bg-slate-50"}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#5A0E24]/10 flex items-center justify-center text-2xl shrink-0">
                  {item.icon || copy.defaultIcon}
                </div>
                <Badge tone={item.visible ? "green" : "slate"}>{item.visible ? "Showing on website" : "Hidden from website"}</Badge>
              </div>
              {item.badge && (
                <div className="mb-1.5">
                  <Badge tone="wine">{item.badge}</Badge>
                </div>
              )}
              <h3 className="font-bold text-slate-800 leading-snug">{item.title || "Untitled"}</h3>
              {item.description && <p className="text-sm text-slate-600 mt-1 line-clamp-3 whitespace-pre-line">{item.description}</p>}
              {item.link && (
                <a href={item.link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#5A0E24] hover:underline mt-2 break-all">
                  &ldquo;Learn more&rdquo; goes to: {item.link}
                </a>
              )}

              <div className="mt-auto pt-4">
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  <Button size="sm" onClick={() => setEditing(item)} disabled={busy}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toggleVisible(item)} disabled={busy}>
                    {busyId === item.id ? "Saving…" : item.visible ? "Hide from website" : "Show on website"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => move(index, -1)} disabled={busy || index === 0} title="Show this earlier on the website">
                    ↑ Up
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => move(index, 1)}
                    disabled={busy || index === items.length - 1}
                    title="Show this later on the website"
                  >
                    ↓ Down
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 ml-auto"
                    onClick={() => {
                      setDeleteError("");
                      setDeleting(item);
                    }}
                    disabled={busy}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <EditPanel
          kind={kind}
          item={editing === "new" ? null : editing}
          nextSortOrder={nextSortOrder}
          api={api}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setFeedback({ success: msg });
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete this ${copy.noun}?`}
          message={`"${deleting.title}" will be removed from the website for good. If you only want to take it down for a while, use "Hide from website" instead.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={deleteBusy}
          error={deleteError}
        />
      )}
    </section>
  );
}

// ─── Add / edit panel ─────────────────────────────────────────────────────────

function EditPanel({
  kind,
  item,
  nextSortOrder,
  api,
  onClose,
  onSaved,
}: {
  kind: Kind;
  item: Item | null;
  nextSortOrder: number;
  api: Api;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const copy = COPY[kind];
  const [form, setForm] = useState<FormState>(() => (item ? formFromItem(item) : emptyForm(kind)));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (!form.icon.trim()) return setError("Please pick an icon.");
    if (!form.title.trim()) return setError("Please enter a title.");
    if (!form.description.trim()) return setError("Please enter a short description.");
    setError("");
    setSaving(true);
    try {
      const payload = buildPayload(kind, form);
      if (item) {
        await api.update(String(item.id), payload);
        onSaved(`"${form.title.trim()}" was saved.`);
      } else {
        // New items go to the end of the list
        await api.create({ ...payload, sort_order: nextSortOrder });
        onSaved(`"${form.title.trim()}" was added${form.visible ? " to the website" : " (hidden for now)"}.`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const previewLink = kind === "program" ? normaliseLink(form.link) : null;

  return (
    <SidePanel
      title={item ? `Edit ${copy.noun}` : copy.addLabel}
      subtitle={kind === "promotion" ? "Shown on the website home page" : "Shown on the website Foundation page"}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback error={error} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : item ? "Save changes" : copy.addLabel}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="block text-sm font-semibold text-slate-700">
            Icon<span className="text-red-500"> *</span>
          </p>
          <p className="block text-xs text-slate-500 mt-0.5">Tap one, or type/paste any emoji in the box.</p>
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            {copy.icons.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => set("icon", ic)}
                aria-label={`Use ${ic}`}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-colors ${
                  form.icon === ic ? "border-[#5A0E24] bg-[#5A0E24]/10" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
          <TextInput
            value={form.icon}
            onChange={(e) => set("icon", e.target.value)}
            placeholder="🎁"
            aria-label="Icon"
            className="max-w-[6rem] text-center text-lg"
          />
        </div>

        {kind === "promotion" && (
          <Field label="Small label" hint='A short tag shown above the title, e.g. "Limited Time" or "Weekend Only". Optional.'>
            <TextInput value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="e.g. Limited Time" maxLength={40} />
          </Field>
        )}

        <Field label="Title" required>
          <TextInput
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={kind === "promotion" ? "e.g. Weekend Getaway Package" : "e.g. Back-to-School Support"}
            maxLength={255}
          />
        </Field>

        <Field label="Description" hint="One or two sentences guests will read." required>
          <TextArea
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder={
              kind === "promotion" ? "e.g. Stay two nights and get breakfast for two free." : "e.g. We provide school supplies to children in our community."
            }
          />
        </Field>

        {kind === "program" && (
          <Field label={'"Learn more" link'} hint="A web address with more details. Leave empty if there isn't one.">
            <TextInput
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="e.g. https://example.org/programme"
              inputMode="url"
              maxLength={255}
            />
          </Field>
        )}

        <Toggle checked={form.visible} onChange={(v) => set("visible", v)} label={copy.toggleLabel} description="Turn off to hide it without deleting it." />

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Preview: how guests will see it</p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <div className="text-4xl mb-3">{form.icon || copy.defaultIcon}</div>
              {kind === "promotion" && form.badge.trim() && (
                <span className="inline-block mb-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#5A0E24] text-white">{form.badge.trim()}</span>
              )}
              <h4 className="font-bold text-slate-800">{form.title.trim() || "Your title here"}</h4>
              <p className="text-sm text-slate-500 mt-1 whitespace-pre-line">{form.description.trim() || "Your description will appear here."}</p>
              {previewLink && <p className="text-sm font-semibold text-[#5A0E24] mt-3">Learn more →</p>}
            </div>
            {!form.visible && <p className="text-xs text-slate-500 mt-2 text-center">This is hidden, so guests won&apos;t see it until you turn it on.</p>}
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
