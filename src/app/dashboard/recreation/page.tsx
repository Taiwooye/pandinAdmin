"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import {
  useRecreationItemList,
  useCreateRecreationItem,
  useUpdateRecreationItem,
  useReorderRecreationItems,
} from "@/hooks/queries/useRecreationItem";
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
  TagInput,
} from "@/components/ui";

// ─── Types (match AdminRecreationResource) ────────────────────────────────────

type Facility = {
  id: number;
  slug: string;
  name: string;
  type: { value: string; label: string };
  description: string;
  status: { value: string; label: string };
  features: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// ─── Plain-language labels (values = backend enums) ───────────────────────────

// RecreationFacilityType
const TYPES = [
  { value: "pool", label: "Swimming pool", icon: "🏊" },
  { value: "basketball", label: "Basketball", icon: "🏀" },
  { value: "billiards", label: "Billiards / snooker", icon: "🎱" },
  { value: "table_tennis", label: "Table tennis", icon: "🏓" },
  { value: "gym", label: "Gym", icon: "🏋️" },
];

// RecreationFacilityStatus
const STATUSES: { value: string; label: string; hint: string; tone: "green" | "amber" | "red" }[] = [
  { value: "available", label: "Open", hint: "Guests can use it now", tone: "green" },
  { value: "coming_soon", label: "Coming soon", hint: "Not open yet", tone: "amber" },
  { value: "maintenance", label: "Closed for maintenance", hint: "Temporarily closed", tone: "red" },
];

const typeInfo = (v: string) => TYPES.find((t) => t.value === v);
const statusInfo = (v: string) => STATUSES.find((s) => s.value === v) ?? STATUSES[0];

function itemsFromResponse(raw: unknown): Facility[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Facility[];
  const w = raw as { data?: unknown };
  return Array.isArray(w.data) ? (w.data as Facility[]) : [];
}

/** No delete hook exists in useRecreationItem, so call the backend's DELETE /recreation/{id} route here. */
function useDeleteFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete(`/api/v1/admin/recreation/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recreation"] }),
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecreationPage() {
  const { data: raw, isLoading, isError } = useRecreationItemList();
  const items = useMemo(
    () => itemsFromResponse(raw).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [raw]
  );

  const [panel, setPanel] = useState<{ mode: "add" } | { mode: "edit"; item: Facility } | null>(null);
  const [deleting, setDeleting] = useState<Facility | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState<{ success?: string; error?: string }>({});

  const deleteMutation = useDeleteFacility();
  const reorderMutation = useReorderRecreationItems();

  function move(item: Facility, direction: -1 | 1) {
    const idx = items.findIndex((f) => f.id === item.id);
    const other = items[idx + direction];
    if (!other) return;
    const order = items.map((f) => (f.id === item.id ? other : f.id === other.id ? item : f));
    const changes = order.map((f, i) => ({ id: f.id, sort_order: i })).filter((c) => items.find((f) => f.id === c.id)?.sort_order !== c.sort_order);
    if (changes.length === 0) return;
    setNotice({});
    reorderMutation.mutate(changes, {
      onSuccess: () => setNotice({ success: "Order saved. The website now lists the facilities in this order." }),
      onError: (err) => setNotice({ error: errorMessage(err) }),
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    setDeleteError("");
    const name = deleting.name;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null);
        setNotice({ success: `"${name}" was deleted and removed from the website.` });
      },
      onError: (err) => setDeleteError(errorMessage(err)),
    });
  }

  return (
    <div>
      <PageHeader
        title="Recreation"
        description="The pool, gym, courts and games shown on the website. Mark a facility as open, coming soon or closed, and list what it offers."
        action={<Button onClick={() => setPanel({ mode: "add" })}>+ Add a facility</Button>}
      />

      {(notice.success || notice.error) && (
        <div className="mb-5 flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <Feedback success={notice.success} error={notice.error} />
          <button onClick={() => setNotice({})} aria-label="Dismiss" className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {isLoading && <LoadingState label="Loading facilities…" />}
      {isError && <ErrorState message="Could not load the facilities. Check your internet connection and refresh the page." />}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon="🏊"
          title="No facilities yet"
          description="Add your pool, gym or games room so guests can see them on the website."
          action={<Button onClick={() => setPanel({ mode: "add" })}>+ Add a facility</Button>}
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => {
            const t = typeInfo(item.type?.value);
            const s = statusInfo(item.status?.value);
            const features = Array.isArray(item.features) ? item.features : [];
            return (
              <Card key={item.id} className="overflow-hidden flex flex-col">
                <div className="h-24 bg-gradient-to-br from-[#5A0E24]/5 to-[#5A0E24]/15 flex items-center justify-center">
                  <span className="text-5xl">{t?.icon ?? "🎯"}</span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-800 leading-snug">{item.name}</h3>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-2">{t?.label ?? item.type?.label}</p>
                  {item.description && <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-3">{item.description}</p>}
                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {features.map((f) => (
                        <span key={f} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                          ✓ {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto space-y-2 pt-2">
                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => setPanel({ mode: "edit", item })}>
                        ✏️ Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setDeleteError("");
                          setDeleting(item);
                        }}
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 border border-slate-200"
                        disabled={i === 0 || reorderMutation.isPending}
                        onClick={() => move(item, -1)}
                      >
                        ← Show earlier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 border border-slate-200"
                        disabled={i === items.length - 1 || reorderMutation.isPending}
                        onClick={() => move(item, 1)}
                      >
                        Show later →
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {panel && (
        <FacilityPanel
          key={panel.mode === "edit" ? panel.item.id : "new"}
          item={panel.mode === "edit" ? panel.item : null}
          nextSortOrder={items.length ? Math.max(...items.map((f) => f.sort_order)) + 1 : 0}
          onCreated={(name) => {
            setPanel(null);
            setNotice({ success: `"${name}" was added. It now shows on the website.` });
          }}
          onClose={() => setPanel(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          message="It will be removed from the website for good. If it is only closed for a while, edit it and choose “Closed for maintenance” instead."
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={deleteMutation.isPending}
          error={deleteError}
        />
      )}
    </div>
  );
}

// ─── Add / edit panel ─────────────────────────────────────────────────────────

function FacilityPanel({
  item,
  nextSortOrder,
  onCreated,
  onClose,
}: {
  item: Facility | null;
  nextSortOrder: number;
  onCreated: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState(item?.type?.value ?? "pool");
  const [status, setStatus] = useState(item?.status?.value ?? "available");
  const [description, setDescription] = useState(item?.description ?? "");
  const [features, setFeatures] = useState<string[]>(Array.isArray(item?.features) ? [...item.features] : []);
  const [feedback, setFeedback] = useState<{ success?: string; error?: string }>({});

  const createMutation = useCreateRecreationItem();
  const updateMutation = useUpdateRecreationItem();
  const saving = createMutation.isPending || updateMutation.isPending;

  function save() {
    if (!name.trim()) return setFeedback({ error: "Please enter a name, e.g. “Swimming pool”." });
    // Backend requires a non-empty description (empty text is rejected)
    if (!description.trim()) return setFeedback({ error: "Please write a short description for the website." });
    setFeedback({});

    const base = { name: name.trim(), type, description: description.trim(), status, features };
    if (!item) {
      createMutation.mutate(
        { ...base, sort_order: nextSortOrder },
        {
          onSuccess: () => onCreated(base.name),
          onError: (err) => setFeedback({ error: errorMessage(err) }),
        }
      );
    } else {
      updateMutation.mutate(
        { id: String(item.id), payload: base },
        {
          onSuccess: () => setFeedback({ success: "Changes saved. The website is updated." }),
          onError: (err) => setFeedback({ error: errorMessage(err) }),
        }
      );
    }
  }

  return (
    <SidePanel
      title={item ? `Edit ${item.name}` : "Add a facility"}
      subtitle="Everything here is shown to guests on the website."
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback success={feedback.success} error={feedback.error} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : item ? "Save changes" : "Add facility"}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {item ? "Close" : "Cancel"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Name" hint="As guests will see it" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Outdoor swimming pool" />
        </Field>

        <div>
          <p className="text-sm font-semibold text-slate-700">
            What kind of facility is it? <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  type === t.value ? "border-[#5A0E24] bg-[#5A0E24]/5 text-[#5A0E24]" : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className="text-lg">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700">Is it open right now?</p>
          <div className="space-y-2 mt-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  status === s.value ? "border-[#5A0E24] bg-[#5A0E24]/5" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{s.label}</span>
                  <span className="block text-xs text-slate-500">{s.hint}</span>
                </span>
                {status === s.value && <span className="text-[#5A0E24] font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <Field label="Description" hint="One or two sentences for the website" required>
          <TextArea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. A heated outdoor pool with sun loungers, open daily from 7am to 8pm."
          />
        </Field>

        <Field label="Features" hint="Type one feature and press Enter, e.g. “Lifeguard on duty”">
          <TagInput value={features} onChange={setFeatures} placeholder="Type a feature and press Enter" />
        </Field>
      </div>
    </SidePanel>
  );
}
