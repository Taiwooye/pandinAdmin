"use client";

import { useState } from "react";
import {
  useTeamMemberList,
  useInviteTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
} from "@/hooks/queries/useTeamMember";
import { usePermissionsMatrix, useUpdateRolePermissions } from "@/hooks/queries/usePermissions";
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
  Select,
  Toggle,
} from "@/components/ui";

// ─── Types (match backend AdminUserResource / PermissionService) ─────────────

type StaffMember = {
  id: number;
  name: string;
  email: string;
  role: { value: string; label: string } | string;
  created_at?: string | null;
};

type PermissionRow = {
  permission: string;
  label: string;
  description: string;
  roles: Record<string, boolean>;
};

/** Roles the backend lets you assign (AdminTeamController: Rule::in([manager, receptionist])) */
type AssignableRole = "manager" | "receptionist";

// ─── Plain-language labels ────────────────────────────────────────────────────

const ROLE_INFO: Record<string, { label: string; tone: "wine" | "amber" | "slate"; summary: string }> = {
  manager: {
    label: "Manager",
    tone: "wine",
    summary: "Runs the hotel day to day: bookings, payments, rooms, the lounge menu and staff accounts.",
  },
  receptionist: {
    label: "Receptionist",
    tone: "amber",
    summary: "Front desk: can look up bookings and guest details.",
  },
  super_admin: {
    label: "Owner (Super Admin)",
    tone: "slate",
    summary: "Can do everything. Owner accounts are protected and not shown in this list.",
  },
};

const ASSIGNABLE_ROLES: AssignableRole[] = ["manager", "receptionist"];

/** Plain words for each backend permission key (app/Enums/Permission.php) */
const PERMISSION_TEXT: Record<string, { label: string; description: string }> = {
  view_bookings: { label: "See bookings", description: "Can look at all bookings and guest contact details" },
  manage_bookings: { label: "Change bookings", description: "Can confirm, cancel and edit bookings and check-in/out dates" },
  verify_payments: { label: "Verify payments", description: "Can mark bookings as paid" },
  view_earnings: { label: "See money reports", description: "Can see revenue and earnings figures" },
  manage_rooms: { label: "Edit hotel rooms", description: "Can change room prices, photos, availability and details" },
  manage_apartments: { label: "Edit apartments", description: "Can change apartment prices and availability" },
  manage_lounge: { label: "Edit lounge menu", description: "Can add, change or remove drinks and food on the lounge menu" },
  invite_admins: { label: "Manage staff accounts", description: "Can add or remove staff, change roles and change these permissions" },
};

const PERMISSION_GROUPS: { title: string; keys: string[] }[] = [
  { title: "Bookings & payments", keys: ["view_bookings", "manage_bookings", "verify_payments"] },
  { title: "Money", keys: ["view_earnings"] },
  { title: "Rooms, apartments & menu", keys: ["manage_rooms", "manage_apartments", "manage_lounge"] },
  { title: "Staff", keys: ["invite_admins"] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listFrom<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const d = (raw as { data?: unknown })?.data;
  return Array.isArray(d) ? (d as T[]) : [];
}

function roleValue(m: StaffMember): string {
  return typeof m.role === "string" ? m.role : m.role?.value ?? "";
}

function roleInfo(value: string) {
  return ROLE_INFO[value] ?? { label: value || "Unknown role", tone: "slate" as const, summary: "" };
}

function permText(row: PermissionRow) {
  return PERMISSION_TEXT[row.permission] ?? { label: row.label, description: row.description };
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Like errorMessage(), but explains the backend's specific "you can't do that" refusals */
function staffError(err: unknown): string {
  const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
  const msg = res?.data?.message?.toLowerCase() ?? "";
  if (res?.status === 403) {
    if (msg.includes("own role")) return "You can't change your own role. Ask another manager to do it.";
    if (msg.includes("own account")) return "You can't remove your own account. Ask another manager to do it.";
    if (msg.includes("super admin") || msg.includes("super_admin")) return "Owner accounts are protected and can't be changed here.";
  }
  if (res?.status === 404) return "This staff member no longer exists. Refresh the page.";
  return errorMessage(err);
}

/** One-line "can do" summary built from the live permissions */
function canDoLine(role: string, rows: PermissionRow[]): string {
  if (rows.length === 0) return roleInfo(role).summary;
  const on = rows.filter((r) => r.roles[role]).map((r) => permText(r).label.toLowerCase());
  if (on.length === 0) return "Currently can't do anything in this portal.";
  if (on.length === rows.length) return "Can do everything in this portal.";
  return `Can: ${on.join(", ")}.`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StaffAccountsPage() {
  const { data: raw, isLoading, isError } = useTeamMemberList();
  const members = listFrom<StaffMember>(raw);

  const { data: permRaw, isLoading: permLoading, isError: permError } = usePermissionsMatrix();
  const permRows = listFrom<PermissionRow>(permRaw);

  const [adding, setAdding] = useState(false);
  const [changingRole, setChangingRole] = useState<StaffMember | null>(null);
  const [removing, setRemoving] = useState<StaffMember | null>(null);
  const [success, setSuccess] = useState("");

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 5000);
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Staff accounts"
        description="Everyone who can sign in to this portal, and what they're allowed to do."
        action={<Button onClick={() => setAdding(true)}>+ Add staff member</Button>}
      />

      {success && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <Feedback success={success} />
        </div>
      )}

      {/* Role explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {ASSIGNABLE_ROLES.map((r) => (
          <Card key={r} className="p-4">
            <Badge tone={roleInfo(r).tone}>{roleInfo(r).label}</Badge>
            <p className="text-sm text-slate-600 mt-2">{roleInfo(r).summary}</p>
            {permRows.length > 0 && <p className="text-xs text-slate-500 mt-1">{canDoLine(r, permRows)}</p>}
          </Card>
        ))}
      </div>

      {/* Staff list */}
      <h2 className="text-lg font-bold text-slate-800 mb-3">Team members {members.length > 0 && <span className="text-slate-400 font-medium">({members.length})</span>}</h2>
      <div className="space-y-3 mb-10">
        {isLoading && <LoadingState label="Loading staff…" />}
        {isError && <ErrorState message="Could not load staff accounts. Check your internet connection and refresh the page." />}
        {!isLoading && !isError && members.length === 0 && (
          <EmptyState
            icon="👥"
            title="No staff accounts yet"
            description="Add your managers and receptionists so they can sign in."
            action={<Button onClick={() => setAdding(true)}>+ Add staff member</Button>}
          />
        )}
        {!isLoading &&
          !isError &&
          members.map((m) => (
            <StaffCard
              key={m.id}
              member={m}
              canDo={canDoLine(roleValue(m), permRows)}
              onChangeRole={() => setChangingRole(m)}
              onRemove={() => setRemoving(m)}
            />
          ))}
      </div>

      {/* Permissions */}
      <PermissionsSection rows={permRows} loading={permLoading} error={permError} />

      {adding && <AddStaffPanel onClose={() => setAdding(false)} onDone={flash} />}
      {changingRole && <ChangeRolePanel member={changingRole} onClose={() => setChangingRole(null)} onDone={flash} />}
      {removing && <RemoveDialog member={removing} onClose={() => setRemoving(null)} onDone={flash} />}
    </div>
  );
}

// ─── Staff card ───────────────────────────────────────────────────────────────

function StaffCard({
  member: m,
  canDo,
  onChangeRole,
  onRemove,
}: {
  member: StaffMember;
  canDo: string;
  onChangeRole: () => void;
  onRemove: () => void;
}) {
  const role = roleValue(m);
  const info = roleInfo(role);
  const isProtected = role === "super_admin";
  const added = formatDate(m.created_at);

  return (
    <Card className="p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#5A0E24]/10 flex items-center justify-center text-[#5A0E24] font-bold text-lg shrink-0">
          {(m.name || m.email).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h3 className="text-base font-bold text-slate-800">{m.name || m.email}</h3>
            <Badge tone={info.tone}>{info.label}</Badge>
            <Badge tone="green">Active – can sign in</Badge>
          </div>
          <p className="text-sm text-slate-600 break-all">{m.email}</p>
          {canDo && <p className="text-xs text-slate-500 mt-1">{canDo}</p>}
          {added && <p className="text-xs text-slate-400 mt-0.5">Added {added}</p>}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {isProtected ? (
            <Badge tone="slate">Protected owner account</Badge>
          ) : (
            <>
              <Button variant="secondary" onClick={onChangeRole}>
                Change role
              </Button>
              <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={onRemove}>
                Remove
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Role picker (Select with plain descriptions) ────────────────────────────

function RolePicker({ value, onChange }: { value: AssignableRole; onChange: (v: AssignableRole) => void }) {
  return (
    <Field label="Role" required hint="This decides what they can see and change.">
      <Select value={value} onChange={(e) => onChange(e.target.value as AssignableRole)}>
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {roleInfo(r).label} – {roleInfo(r).summary}
          </option>
        ))}
      </Select>
      <p className="text-xs text-slate-500 mt-1.5">{roleInfo(value).summary}</p>
    </Field>
  );
}

// ─── Add staff member ─────────────────────────────────────────────────────────

function AddStaffPanel({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const invite = useInviteTeamMember();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("receptionist");
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string; warning: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setError("");
    const n = name.trim();
    const e = email.trim();
    if (!n) return setError("Please type their full name.");
    if (!isValidEmail(e)) return setError("Please type a valid email address, e.g. amaka@example.com.");
    try {
      // Backend (AdminTeamController@invite) only accepts name, email and role.
      // It creates the temporary password itself and emails it to the new staff member.
      const payload = { name: n, email: e, role };
      const res = (await invite.mutateAsync(payload)) as {
        temporary_password?: string;
        warning?: string;
      };
      if (res?.temporary_password) {
        // Email failed — the backend hands back the password so it can be shared by hand
        setTempPassword({ email: e, password: res.temporary_password, warning: res.warning ?? "" });
        return;
      }
      onDone(`${n} was added. We've emailed ${e} their sign-in details and a temporary password.`);
      onClose();
    } catch (err) {
      setError(staffError(err));
    }
  };

  const copy = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — staff can still read it on screen
    }
  };

  if (tempPassword) {
    return (
      <SidePanel
        title="Staff member added"
        subtitle="But the welcome email could not be sent"
        onClose={() => {
          onDone(`${name.trim()} was added. Remember to give them their temporary password.`);
          onClose();
        }}
        footer={
          <Button
            className="w-full"
            onClick={() => {
              onDone(`${name.trim()} was added. Remember to give them their temporary password.`);
              onClose();
            }}
          >
            I&apos;ve noted the password – close
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            We couldn&apos;t email <strong>{tempPassword.email}</strong>. Give them this temporary password yourself (in person or by phone).
            It will not be shown again after you close this.
          </div>
          <Field label="Temporary password">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <TextInput readOnly type={showPassword ? "text" : "password"} value={tempPassword.password} className="pr-16 font-mono" />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <Button variant="secondary" onClick={copy}>
                {copied ? "Copied ✓" : "Copy"}
              </Button>
            </div>
          </Field>
          <p className="text-sm text-slate-600">They sign in with their email address and this password.</p>
        </div>
      </SidePanel>
    );
  }

  return (
    <SidePanel
      title="Add staff member"
      subtitle="Give someone access to this portal"
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback error={error} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={submit} disabled={invite.isPending}>
              {invite.isPending ? "Adding…" : "Add and send email"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={invite.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          📧 They&apos;ll get an email with a <strong>temporary password</strong> so they can sign in. You don&apos;t need to make one up.
        </div>
        <Field label="Full name" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amaka Johnson" autoFocus />
        </Field>
        <Field label="Email address" required hint="Their sign-in details will be sent here.">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="amaka@example.com" />
        </Field>
        <RolePicker value={role} onChange={setRole} />
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </SidePanel>
  );
}

// ─── Change role ──────────────────────────────────────────────────────────────

function ChangeRolePanel({ member, onClose, onDone }: { member: StaffMember; onClose: () => void; onDone: (msg: string) => void }) {
  const update = useUpdateTeamMember();
  const current = roleValue(member);
  const [role, setRole] = useState<AssignableRole>(current === "manager" ? "manager" : "receptionist");
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    try {
      // Backend (AdminTeamController@update) validates only `role` (manager | receptionist)
      await update.mutateAsync({ id: String(member.id), payload: { role } });
      onDone(`${member.name} is now a ${roleInfo(role).label}.`);
      onClose();
    } catch (err) {
      setError(staffError(err));
    }
  };

  return (
    <SidePanel
      title="Change role"
      subtitle={`${member.name} · ${member.email}`}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <Feedback error={error} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={save} disabled={update.isPending || role === current}>
              {update.isPending ? "Saving…" : "Save role"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          Currently: <Badge tone={roleInfo(current).tone}>{roleInfo(current).label}</Badge>
        </p>
        <RolePicker value={role} onChange={setRole} />
        <p className="text-xs text-slate-500">The change takes effect the next time they open a page. You can&apos;t change your own role.</p>
      </div>
    </SidePanel>
  );
}

// ─── Remove ───────────────────────────────────────────────────────────────────

function RemoveDialog({ member, onClose, onDone }: { member: StaffMember; onClose: () => void; onDone: (msg: string) => void }) {
  const remove = useDeleteTeamMember();
  const [error, setError] = useState("");

  const confirm = async () => {
    setError("");
    try {
      await remove.mutateAsync(String(member.id));
      onDone(`${member.name} was removed and can no longer sign in.`);
      onClose();
    } catch (err) {
      setError(staffError(err));
    }
  };

  return (
    <ConfirmDialog
      title={`Remove ${member.name}?`}
      message={`${member.email} will no longer be able to sign in to this portal. This can't be undone – to give them access again you'd have to add them as a new staff member. You can't remove your own account.`}
      confirmLabel="Yes, remove access"
      cancelLabel="No, keep them"
      busy={remove.isPending}
      error={error}
      onConfirm={confirm}
      onCancel={onClose}
    />
  );
}

// ─── Permissions ──────────────────────────────────────────────────────────────

function PermissionsSection({ rows, loading, error }: { rows: PermissionRow[]; loading: boolean; error: boolean }) {
  const updateRole = useUpdateRolePermissions();
  // Roles come from the API (manager, receptionist); fall back to the known pair
  const roles = rows.length > 0 ? Object.keys(rows[0].roles) : ASSIGNABLE_ROLES;
  const [activeRole, setActiveRole] = useState<string>("receptionist");
  const role = roles.includes(activeRole) ? activeRole : roles[0];

  // Unsaved edits: role → { permission → on/off }
  const [edits, setEdits] = useState<Record<string, Record<string, boolean>>>({});
  const [result, setResult] = useState<{ success?: string; error?: string }>({});

  const value = (r: string, key: string) => edits[r]?.[key] ?? rows.find((x) => x.permission === key)?.roles[r] ?? false;
  const dirty = (r: string) => Object.entries(edits[r] ?? {}).some(([k, v]) => rows.find((x) => x.permission === k)?.roles[r] !== v);

  const toggle = (key: string, on: boolean) => {
    setResult({});
    setEdits((prev) => ({ ...prev, [role]: { ...(prev[role] ?? {}), [key]: on } }));
  };

  const save = async () => {
    setResult({});
    // Backend (AdminPermissionController@update): PUT /permissions/{role} { permissions: { <permission key>: boolean } }
    const permissions: Record<string, boolean> = {};
    for (const row of rows) permissions[row.permission] = value(role, row.permission);
    try {
      await updateRole.mutateAsync({ role, permissions });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[role];
        return next;
      });
      setResult({ success: `Saved. Every ${roleInfo(role).label.toLowerCase()} now has these permissions.` });
    } catch (err) {
      setResult({ error: staffError(err) });
    }
  };

  const undo = () => {
    setResult({});
    setEdits((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
  };

  // Group known permissions; anything new from the backend goes in "Other"
  const known = new Set(PERMISSION_GROUPS.flatMap((g) => g.keys));
  const groups = [
    ...PERMISSION_GROUPS.map((g) => ({ title: g.title, rows: g.keys.map((k) => rows.find((r) => r.permission === k)).filter((r): r is PermissionRow => !!r) })),
    { title: "Other", rows: rows.filter((r) => !known.has(r.permission)) },
  ].filter((g) => g.rows.length > 0);

  const turningOffStaffForManagers = role === "manager" && rows.some((r) => r.permission === "invite_admins") && !value("manager", "invite_admins");

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-800">What each role can do</h2>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        Switch things on or off for a role. Changes apply to <strong>everyone</strong> with that role. Owner accounts can always do everything.
      </p>

      {loading && <LoadingState label="Loading permissions…" />}
      {error && <ErrorState message="Could not load permissions. Check your internet connection and refresh the page." />}
      {!loading && !error && rows.length === 0 && <EmptyState icon="🔒" title="No permissions to show" />}

      {!loading && !error && rows.length > 0 && (
        <Card className="p-5">
          {/* Role chooser */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {roles.map((r) => {
              const active = r === role;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setActiveRole(r);
                    setResult({});
                  }}
                  className={`text-left rounded-2xl border-2 px-4 py-3 transition-all ${
                    active ? "border-[#5A0E24] bg-[#5A0E24] text-white shadow-md" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`block text-sm font-semibold ${active ? "text-white" : "text-slate-700"}`}>
                    {roleInfo(r).label}
                    {dirty(r) && <span className={`ml-2 text-xs font-medium ${active ? "text-amber-200" : "text-amber-600"}`}>• not saved</span>}
                  </span>
                  <span className={`block text-xs mt-0.5 ${active ? "text-white/80" : "text-slate-500"}`}>
                    {rows.filter((row) => value(r, row.permission)).length} of {rows.length} switched on
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-6">
            {groups.map((g) => (
              <div key={g.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{g.title}</h3>
                <div className="space-y-2">
                  {g.rows.map((row) => {
                    const t = permText(row);
                    return (
                      <Toggle
                        key={row.permission}
                        checked={value(role, row.permission)}
                        onChange={(on) => toggle(row.permission, on)}
                        label={t.label}
                        description={t.description}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {turningOffStaffForManagers && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ With &quot;Manage staff accounts&quot; off, managers (including you, if you&apos;re a manager) won&apos;t be able to add staff or change
              these settings. Only an owner account could switch it back on.
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <Feedback success={result.success} error={result.error} />
            </div>
            {dirty(role) && (
              <Button variant="secondary" onClick={undo} disabled={updateRole.isPending}>
                Undo changes
              </Button>
            )}
            <Button onClick={save} disabled={!dirty(role) || updateRole.isPending}>
              {updateRole.isPending ? "Saving…" : `Save ${roleInfo(role).label.toLowerCase()} permissions`}
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
}
