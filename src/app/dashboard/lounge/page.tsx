"use client";

import { useState } from "react";
import { useBarList, useUpdateBar } from "@/hooks/queries/useBar";
import { useMenuItemList, useAddMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@/hooks/queries/useMenuItem";
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
  Select,
  Toggle,
} from "@/components/ui";

// ─── Types (match AdminBarVenueResource / AdminMenuItemResource) ──────────────

type Bar = {
  id: number;
  name: string;
  description: string | null;
  status: { value: string; label: string } | string | null;
  features?: string[] | null;
};

type MenuItem = {
  id: number;
  bar_venue_id?: number;
  name: string;
  description: string | null;
  category: { value: string; label: string } | string | null;
  price: number | string;
  is_available: boolean;
  sort_order: number | null;
};

// ─── Plain-language labels ────────────────────────────────────────────────────

// Must match App\Enums\MenuItemCategory
const CATEGORIES = [
  { value: "cocktails", label: "Cocktails", icon: "🍸", example: "e.g. Pina Colada" },
  { value: "wines", label: "Wines", icon: "🍷", example: "e.g. Rosé Wine (glass)" },
  { value: "beers", label: "Beers", icon: "🍺", example: "e.g. Heineken" },
  { value: "spirits", label: "Spirits", icon: "🥃", example: "e.g. Hennessy VS" },
  { value: "non_alcoholic", label: "Non-Alcoholic", icon: "🧃", example: "e.g. Chapman" },
];

const catInfo = (value: string) => CATEGORIES.find((c) => c.value === value) ?? { value, label: value, icon: "🥤", example: "e.g. Drink name" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listFrom<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const d = (raw as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as T[]) : [];
}

const enumValue = (v: { value: string } | string | null | undefined) => (typeof v === "object" && v ? v.value : v ?? "");

const isOpen = (b: Bar) => enumValue(b.status) !== "closed";

function naira(n: number | string): string {
  const num = Number(n);
  return Number.isNaN(num) ? "" : `₦${num.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoungePage() {
  const { data: barsRaw, isLoading: barsLoading, isError: barsError } = useBarList();
  const bars = listFrom<Bar>(barsRaw);
  const [selectedBarId, setSelectedBarId] = useState<number | null>(null);
  const bar = bars.find((b) => b.id === selectedBarId) ?? bars[0];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Lounge & bar menu"
        description="Update the drinks and prices guests see on the website. Switch a drink to “Sold out” when you run out."
      />

      {barsLoading && <LoadingState label="Loading lounges…" />}
      {barsError && <ErrorState message="Could not load the lounges. Check your internet connection and refresh the page." />}
      {!barsLoading && !barsError && bars.length === 0 && (
        <EmptyState icon="🍸" title="No lounges set up yet" description="Ask your website administrator to add a lounge or bar first." />
      )}

      {!barsLoading && !barsError && bar && (
        <>
          {bars.length > 1 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-700 mb-2">Choose a lounge</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {bars.map((b) => {
                  const active = b.id === bar.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBarId(b.id)}
                      className={`text-left rounded-2xl border-2 px-4 py-3 transition-all ${
                        active ? "border-[#5A0E24] bg-[#5A0E24] text-white shadow-md" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className={`block font-semibold ${active ? "text-white" : "text-slate-800"}`}>{b.name}</span>
                      <span className={`block text-xs mt-0.5 ${active ? "text-white/80" : "text-slate-500"}`}>{isOpen(b) ? "🟢 Open" : "⚪ Closed"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <LoungeStatusCard key={`status-${bar.id}`} bar={bar} />
          <DrinksMenu key={`menu-${bar.id}`} bar={bar} />
        </>
      )}
    </div>
  );
}

// ─── Lounge open / closed ─────────────────────────────────────────────────────

function LoungeStatusCard({ bar }: { bar: Bar }) {
  const update = useUpdateBar();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const open = isOpen(bar);

  function toggle() {
    setSuccess("");
    setError("");
    const next = open ? "closed" : "open"; // App\Enums\BarVenueStatus
    update.mutate(
      { id: String(bar.id), payload: { status: next } },
      {
        onSuccess: () => setSuccess(next === "open" ? `${bar.name} is now shown as open.` : `${bar.name} is now shown as closed.`),
        onError: (err) => setError(errorMessage(err)),
      }
    );
  }

  return (
    <Card className="p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#5A0E24]/10 flex items-center justify-center text-2xl shrink-0">🍸</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">{bar.name}</h2>
            <Badge tone={open ? "green" : "slate"}>{open ? "Open" : "Closed"}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {open ? "Guests see this lounge as open on the website." : "Guests see this lounge as closed on the website."}
          </p>
        </div>
        <Button variant={open ? "secondary" : "success"} onClick={toggle} disabled={update.isPending} className="shrink-0">
          {update.isPending ? "Saving…" : open ? "Mark as closed" : "Mark as open"}
        </Button>
      </div>
      {(success || error) && (
        <div className="mt-3">
          <Feedback success={success} error={error} />
        </div>
      )}
    </Card>
  );
}

// ─── Drinks menu ──────────────────────────────────────────────────────────────

type PanelState = { mode: "add"; category: string } | { mode: "edit"; item: MenuItem } | null;

function DrinksMenu({ bar }: { bar: Bar }) {
  const barId = String(bar.id);
  const { data: menuRaw, isLoading, isError } = useMenuItemList(barId);
  const items = listFrom<MenuItem>(menuRaw);

  const availability = useUpdateMenuItem();
  const remove = useDeleteMenuItem();

  const [panel, setPanel] = useState<PanelState>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState<{ success?: string; error?: string }>({});

  // Group items by category; keep any unknown categories at the end so nothing is hidden
  const knownValues = CATEGORIES.map((c) => c.value);
  const extraValues = Array.from(new Set(items.map((i) => enumValue(i.category)).filter((v) => !knownValues.includes(v))));
  const groups = [...knownValues, ...extraValues].map((value) => ({
    ...catInfo(value),
    items: items.filter((i) => enumValue(i.category) === value).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }));

  function toggleAvailable(item: MenuItem) {
    setNotice({});
    const next = !item.is_available;
    availability.mutate(
      { barId, itemId: String(item.id), payload: { is_available: next } },
      {
        onSuccess: () => setNotice({ success: next ? `${item.name} is back on the menu.` : `${item.name} is now marked as sold out.` }),
        onError: (err) => setNotice({ error: errorMessage(err) }),
      }
    );
  }

  function executeDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    const name = deleteTarget.name;
    remove.mutate(
      { barId, itemId: String(deleteTarget.id) },
      {
        onSuccess: () => {
          setDeleteTarget(null);
          setNotice({ success: `${name} was removed from the menu.` });
        },
        onError: (err) => setDeleteError(errorMessage(err)),
      }
    );
  }

  const togglingId = availability.isPending ? availability.variables?.itemId : undefined;

  if (isLoading) return <LoadingState label="Loading drinks menu…" />;
  if (isError) return <ErrorState message="Could not load the drinks menu. Check your internet connection and refresh the page." />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Drinks menu</h2>
          <p className="text-sm text-slate-500">
            {items.length} drink{items.length === 1 ? "" : "s"} on the menu
            {items.some((i) => !i.is_available) && ` · ${items.filter((i) => !i.is_available).length} sold out`}
          </p>
        </div>
        <Button
          onClick={() => {
            setNotice({});
            setPanel({ mode: "add", category: CATEGORIES[0].value });
          }}
        >
          + Add drink
        </Button>
      </div>

      {(notice.success || notice.error) && (
        <div className="mb-4">
          <Feedback success={notice.success} error={notice.error} />
        </div>
      )}

      <div className="space-y-5">
        {groups.map((g) => (
          <Card key={g.value} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{g.icon}</span>
                <h3 className="font-bold text-slate-800">{g.label}</h3>
                <Badge>{g.items.length}</Badge>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setNotice({});
                  setPanel({ mode: "add", category: knownValues.includes(g.value) ? g.value : CATEGORIES[0].value });
                }}
              >
                + Add drink
              </Button>
            </div>

            {g.items.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400">No {g.label.toLowerCase()} on the menu yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {g.items.map((item) => {
                  const busy = togglingId === String(item.id);
                  return (
                    <li key={item.id} className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 ${item.is_available ? "" : "bg-slate-50"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-semibold ${item.is_available ? "text-slate-800" : "text-slate-500 line-through"}`}>{item.name}</span>
                          {!item.is_available && <Badge tone="red">Sold out</Badge>}
                        </div>
                        {item.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>}
                      </div>

                      <span className="text-base font-bold text-[#5A0E24] sm:w-28 sm:text-right shrink-0">{naira(item.price)}</span>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleAvailable(item)}
                          disabled={busy}
                          title={item.is_available ? "Click to mark as sold out" : "Click to put back on the menu"}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold disabled:opacity-50 ${
                            item.is_available ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <span className={`relative w-8 h-5 rounded-full transition-colors ${item.is_available ? "bg-emerald-600" : "bg-slate-300"}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${item.is_available ? "left-3.5" : "left-0.5"}`} />
                          </span>
                          {busy ? "Saving…" : item.is_available ? "Available" : "Sold out"}
                        </button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setNotice({});
                            setPanel({ mode: "edit", item });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setNotice({});
                            setDeleteError("");
                            setDeleteTarget(item);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ))}
      </div>

      {panel && (
        <DrinkPanel
          key={panel.mode === "edit" ? `edit-${panel.item.id}` : `add-${panel.category}`}
          barId={barId}
          barName={bar.name}
          item={panel.mode === "edit" ? panel.item : null}
          defaultCategory={panel.mode === "add" ? panel.category : enumValue(panel.item.category)}
          nextSortOrder={(category) => {
            const inCat = items.filter((i) => enumValue(i.category) === category);
            return inCat.length ? Math.max(...inCat.map((i) => i.sort_order ?? 0)) + 1 : 0;
          }}
          onClose={() => setPanel(null)}
          onSaved={(msg) => {
            setPanel(null);
            setNotice({ success: msg });
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget.name}"?`}
          message="This drink will be removed from the menu. If you just ran out, use “Sold out” instead so you can bring it back later."
          confirmLabel="Yes, delete drink"
          onConfirm={executeDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={remove.isPending}
          error={deleteError}
        />
      )}
    </div>
  );
}

// ─── Add / edit drink panel ───────────────────────────────────────────────────

function DrinkPanel({
  barId,
  barName,
  item,
  defaultCategory,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  barId: string;
  barName: string;
  item: MenuItem | null;
  defaultCategory: string;
  nextSortOrder: (category: string) => number;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const add = useAddMenuItem();
  const update = useUpdateMenuItem();
  const saving = add.isPending || update.isPending;

  const startCategory = CATEGORIES.some((c) => c.value === defaultCategory) ? defaultCategory : CATEGORIES[0].value;
  const [category, setCategory] = useState(startCategory);
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(Number(item.price)) : "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [available, setAvailable] = useState(item ? item.is_available : true);
  const [sortOrder, setSortOrder] = useState(String(item ? item.sort_order ?? 0 : nextSortOrder(startCategory)));
  const [error, setError] = useState("");

  const info = catInfo(category);
  const cleanPrice = price.replace(/,/g, "").trim();

  function save() {
    setError("");
    if (!name.trim()) return setError("Please enter the drink's name.");
    if (!/^\d+(\.\d{1,2})?$/.test(cleanPrice)) return setError("Please enter the price in Naira (numbers only, e.g. 3500).");
    if (!/^\d+$/.test(sortOrder.trim())) return setError("Position on the menu must be a whole number (0 or more).");

    // Matches AdminMenuItemController store/update rules
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      price: Number(cleanPrice),
      is_available: available,
      sort_order: parseInt(sortOrder, 10),
    };
    const onError = (err: unknown) => setError(errorMessage(err));
    if (item) {
      update.mutate({ barId, itemId: String(item.id), payload }, { onSuccess: () => onSaved(`${payload.name} was saved.`), onError });
    } else {
      add.mutate({ barId, payload }, { onSuccess: () => onSaved(`${payload.name} was added to ${catInfo(category).label}.`), onError });
    }
  }

  return (
    <SidePanel
      title={item ? "Edit drink" : "Add drink"}
      subtitle={`${info.icon} ${info.label} · ${barName}`}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback error={error} />
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="flex-1">
              {saving ? "Saving…" : item ? "Save changes" : "Add drink"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Type of drink" required>
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (!item) setSortOrder(String(nextSortOrder(e.target.value)));
              setError("");
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Drink name" required>
          <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={info.example} />
        </Field>

        <div>
          <Field label="Price (₦)" hint="Numbers only, no commas" required>
            <TextInput type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 3500" />
          </Field>
          {cleanPrice && naira(cleanPrice) && <p className="mt-1 text-xs text-slate-500">Guests will see {naira(cleanPrice)}</p>}
        </div>

        <Field label="Short description" hint="Optional – e.g. ingredients or bottle size">
          <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Rum, coconut cream and pineapple" />
        </Field>

        <Toggle
          checked={available}
          onChange={setAvailable}
          label={available ? "Available" : "Sold out"}
          description={available ? "Guests can order this drink" : "Shown as unavailable – switch on when it's back in stock"}
        />

        <Field label="Position on the menu" hint="Lower numbers show first in this section. Leave as it is if unsure.">
          <TextInput type="number" inputMode="numeric" min={0} step={1} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="max-w-[8rem]" />
        </Field>
      </div>
    </SidePanel>
  );
}
