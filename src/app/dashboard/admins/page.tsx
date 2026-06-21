"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  useTeamMemberList,
  useInviteTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
} from "@/hooks/queries/useTeamMember";
import { usePermissionsMatrix, useUpdateRolePermissions } from "@/hooks/queries/usePermissions";

// ─── Types ────────────────────────────────────────────────────────────────────

type TeamMember = {
  id: number | string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role?: string | { value: string; label: string };
  status?: string | { value: string; label: string };
  created_at?: string;
  joined_at?: string;
};

type ApiPermissionRow = {
  permission: string;
  label: string;
  description: string;
  roles: Record<string, boolean>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function membersFromResponse(raw: unknown): TeamMember[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as TeamMember[];
  const w = raw as { data?: unknown };
  if (Array.isArray(w.data)) return w.data as TeamMember[];
  return [];
}

function memberName(m: TeamMember): string {
  if (m.name) return m.name;
  if (m.full_name) return m.full_name;
  if (m.first_name || m.last_name) return `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
  return m.email;
}

function memberRole(m: TeamMember): string {
  const r = m.role;
  if (!r) return "—";
  if (typeof r === "string") return r;
  return r.label ?? r.value ?? "—";
}

function memberStatus(m: TeamMember): string {
  const s = m.status;
  if (!s) return "active";
  if (typeof s === "string") return s.toLowerCase();
  return (s.value ?? "active").toLowerCase();
}

function memberId(m: TeamMember): string {
  return String(m.id);
}

function isSuperAdmin(m: TeamMember): boolean {
  const r = memberRole(m).toLowerCase().replace(/[\s_-]/g, "");
  return r === "superadmin" || r === "super";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: { value: string; label: string; desc: string }[] = [
  { value: "manager", label: "Manager", desc: "Full access — manage everything including bookings, rooms, menu, and other admins" },
  { value: "receptionist", label: "Receptionist", desc: "View and update bookings only" },
];

const ROLE_COLORS: Record<string, string> = {
  Manager:      "bg-[#5A0E24]/10 text-[#5A0E24]",
  manager:      "bg-[#5A0E24]/10 text-[#5A0E24]",
  Receptionist: "bg-amber-50 text-amber-700",
  receptionist: "bg-amber-50 text-amber-700",
};

function roleColor(role: string) {
  return ROLE_COLORS[role] ?? "bg-slate-100 text-slate-600";
}


// ─── Invite form schema ───────────────────────────────────────────────────────

const inviteSchema = yup.object({
  name: yup.string().trim().required("Full name is required"),
  email: yup.string().trim().email("Enter a valid email address").required("Email is required"),
  password: yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
  password_confirmation: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
  role: yup.string().required("Role is required"),
});

type InviteFormValues = yup.InferType<typeof inviteSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminsPage() {
  // ── Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<InviteFormValues>({
    resolver: yupResolver(inviteSchema),
    defaultValues: { name: "", email: "", password: "", password_confirmation: "", role: "manager" },
    mode: "onChange",
  });

  const watchedRole = watch("role");

  // ── Role edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("manager");

  // ── Toast
  const [toast, setToast] = useState<string | null>(null);

  // ── Permissions (live from API)
  const { data: permRaw, isLoading: permLoading } = usePermissionsMatrix();
  const updateRolePermMutation = useUpdateRolePermissions();

  // permMatrix: array of rows from the API
  const permMatrix: ApiPermissionRow[] = (() => {
    if (!permRaw) return [];
    const w = permRaw as { data?: unknown };
    return (Array.isArray(w.data) ? w.data : Array.isArray(permRaw) ? permRaw : []) as ApiPermissionRow[];
  })();

  // local overrides: role → { permission_key → bool }
  const [localPerms, setLocalPerms] = useState<Record<string, Record<string, boolean>>>({});
  // which roles have unsaved changes
  const [dirtyRoles, setDirtyRoles] = useState<Set<string>>(new Set());
  const [permSaved, setPermSaved] = useState(false);
  const [permError, setPermError] = useState("");

  // ── Data
  const { data: raw, isLoading, isError, error } = useTeamMemberList();
  const members: TeamMember[] = membersFromResponse(raw);

  const activeMembers = members.filter((m) => memberStatus(m) !== "pending" && memberStatus(m) !== "invited");
  const pendingMembers = members.filter((m) => memberStatus(m) === "pending" || memberStatus(m) === "invited");

  // ── Mutations
  const inviteMutation = useInviteTeamMember();
  const updateMutation = useUpdateTeamMember();
  const deleteMutation = useDeleteTeamMember();

  // ── Handlers

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function openInvite() {
    reset({ name: "", email: "", password: "", password_confirmation: "", role: "manager" });
    setShowPassword(false);
    setShowInvite(true);
  }

  const onSubmitInvite = handleSubmit((values) => {
    inviteMutation.mutate(
      { name: values.name, email: values.email, role: values.role, password: values.password, password_confirmation: values.password_confirmation },
      {
        onSuccess: () => {
          setShowInvite(false);
          showToast(`Invitation sent to ${values.email}`);
          reset();
        },
      }
    );
  });

  function startEditRole(m: TeamMember) {
    setEditingId(memberId(m));
    setEditRole(memberRole(m));
  }

  function saveRole(m: TeamMember) {
    updateMutation.mutate(
      { id: memberId(m), payload: { name: memberName(m), role: editRole } },
      { onSuccess: () => setEditingId(null) }
    );
  }

  function removeMember(m: TeamMember) {
    deleteMutation.mutate(memberId(m), {
      onSuccess: () => showToast(`${memberName(m)} removed from the team`),
    });
  }

  function resolvedPerm(role: string, key: string): boolean {
    if (localPerms[role] && key in localPerms[role]) return localPerms[role][key];
    const row = permMatrix.find((r) => r.permission === key);
    return row?.roles[role] ?? false;
  }

  function togglePermission(role: string, key: string) {
    const current = resolvedPerm(role, key);
    setLocalPerms((prev) => ({
      ...prev,
      [role]: { ...(prev[role] ?? {}), [key]: !current },
    }));
    setDirtyRoles((prev) => new Set(prev).add(role));
    setPermSaved(false);
    setPermError("");
  }

  async function savePermissions() {
    setPermError("");
    const roles = Array.from(dirtyRoles);
    if (roles.length === 0) return;

    // Build full permissions object for each dirty role
    const updates = roles.map((role) => {
      const full: Record<string, boolean> = {};
      for (const row of permMatrix) {
        full[row.permission] = resolvedPerm(role, row.permission);
      }
      return { role, permissions: full };
    });

    try {
      await Promise.all(updates.map((u) => updateRolePermMutation.mutateAsync(u)));
      setDirtyRoles(new Set());
      setLocalPerms({});
      setPermSaved(true);
      setTimeout(() => setPermSaved(false), 3000);
    } catch {
      setPermError("Failed to save permissions. Please try again.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Team</h1>
          <p className="text-slate-500 text-sm mt-1">Manage who has access to this portal and what they can do.</p>
        </div>
        <button
          onClick={openInvite}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Admin
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {toast}
          <button onClick={() => setToast(null)} className="ml-auto text-green-400 hover:text-green-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {ROLES.map((r) => (
          <div key={r.value} className="bg-white rounded-xl border border-slate-100 p-4">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-2 ${roleColor(r.value)}`}>{r.label}</span>
            <p className="text-xs text-slate-400 leading-snug">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-3 justify-center py-16 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading team…</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-12 space-y-1">
          <p className="text-red-500 font-semibold text-sm">Failed to load team members.</p>
          {error instanceof Error && <p className="text-xs text-slate-400 font-mono">{error.message}</p>}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Active members */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Active Members</h2>
              <span className="text-xs text-slate-400 ml-1">{activeMembers.length}</span>
            </div>

            {activeMembers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No active members yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {activeMembers.map((m) => {
                  const id = memberId(m);
                  const name = memberName(m);
                  const role = memberRole(m);
                  const isEditing = editingId === id;
                  return (
                    <div key={id} className="px-6 py-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#5A0E24]/10 flex items-center justify-center text-[#5A0E24] font-bold text-sm shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{name}</p>
                        <p className="text-xs text-slate-400">{m.email}</p>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          >
                            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <button
                            onClick={() => saveRole(m)}
                            disabled={updateMutation.isPending}
                            className="px-3 py-1.5 bg-[#5A0E24] text-white text-xs font-semibold rounded-lg hover:bg-[#921224] disabled:opacity-50"
                          >
                            {updateMutation.isPending ? "…" : "Save"}
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${roleColor(role)}`}>{role}</span>
                          {isSuperAdmin(m) ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-400 select-none">Protected</span>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditRole(m)}
                                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                Edit Role
                              </button>
                              <button
                                onClick={() => removeMember(m)}
                                disabled={deleteMutation.isPending}
                                className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {pendingMembers.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h2 className="font-semibold text-slate-800 text-sm">Pending Invitations</h2>
                <span className="text-xs text-slate-400 ml-1">{pendingMembers.length}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {pendingMembers.map((m) => {
                  const id = memberId(m);
                  const name = memberName(m);
                  const role = memberRole(m);
                  return (
                    <div key={id} className="px-6 py-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{name}</p>
                        <p className="text-xs text-slate-400">{m.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${roleColor(role)}`}>{role}</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">Awaiting</span>
                        <button
                          onClick={() => removeMember(m)}
                          disabled={deleteMutation.isPending}
                          className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Permission Settings */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Permission Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">Control what each role can do across the portal</p>
          </div>
        </div>

        <div className="p-6">
          {permSaved && (
            <div className="mb-5 flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Permissions saved successfully.
            </div>
          )}

          {permError && (
            <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {permError}
              <button onClick={() => setPermError("")} className="ml-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {permLoading ? (
            <div className="flex items-center gap-3 justify-center py-10 text-slate-400">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading permissions…</span>
            </div>
          ) : permMatrix.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No permissions data available.</p>
          ) : (
            <>
              {/* Derive role keys from API (preserves order: manager first) */}
              {(() => {
                const roles = permMatrix.length > 0 ? Object.keys(permMatrix[0].roles) : [];
                const roleLabels: Record<string, { label: string; color: string }> = {
                  manager:      { label: "Manager",      color: "text-[#5A0E24]" },
                  receptionist: { label: "Receptionist", color: "text-amber-600" },
                };
                const toggleColor: Record<string, string> = {
                  manager:      "bg-[#5A0E24]",
                  receptionist: "bg-amber-500",
                };

                return (
                  <>
                    <div className={`grid gap-4 mb-3 px-2`} style={{ gridTemplateColumns: `1fr ${roles.map(() => "120px").join(" ")}` }}>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Permission</div>
                      {roles.map((role) => (
                        <div key={role} className={`text-xs font-semibold uppercase tracking-wider text-center ${roleLabels[role]?.color ?? "text-slate-600"}`}>
                          {roleLabels[role]?.label ?? role}
                          {dirtyRoles.has(role) && (
                            <span className="ml-1 text-amber-500 text-[10px] font-bold">●</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="divide-y divide-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                      {permMatrix.map((row) => (
                        <div
                          key={row.permission}
                          className="items-center px-4 py-3.5 bg-white hover:bg-slate-50 transition-colors grid gap-4"
                          style={{ gridTemplateColumns: `1fr ${roles.map(() => "120px").join(" ")}` }}
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-700">{row.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{row.description}</p>
                          </div>
                          {roles.map((role) => {
                            const on = resolvedPerm(role, row.permission);
                            return (
                              <div key={role} className="flex justify-center">
                                <button
                                  onClick={() => togglePermission(role, row.permission)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                    on ? (toggleColor[role] ?? "bg-slate-500") : "bg-slate-200"
                                  }`}
                                  role="switch"
                                  aria-checked={on}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Changes apply to all users with that role across the portal.
              </p>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={savePermissions}
                  disabled={dirtyRoles.size === 0 || updateRolePermMutation.isPending}
                  className="px-5 py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateRolePermMutation.isPending ? "Saving…" : "Save Permissions"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Invite modal ─────────────────────────────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <form
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSubmitInvite}
            noValidate
          >
            <div>
              <h3 className="font-bold text-slate-800">Invite New Admin</h3>
              <p className="text-xs text-slate-400 mt-0.5">They&apos;ll receive an invitation to access the portal.</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Full Name *</label>
              <input
                {...register("name")}
                placeholder="e.g. Amaka Johnson"
                autoFocus
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.name ? "border-red-300 bg-red-50" : "border-slate-200"}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Email Address *</label>
              <input
                {...register("email")}
                type="email"
                placeholder="amaka@example.com"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.email ? "border-red-300 bg-red-50" : "border-slate-200"}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Password *</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  className={`w-full px-4 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.password ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    {showPassword
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Confirm Password *</label>
              <input
                {...register("password_confirmation")}
                type={showPassword ? "text" : "password"}
                placeholder="Repeat password"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${errors.password_confirmation ? "border-red-300 bg-red-50" : "border-slate-200"}`}
              />
              {errors.password_confirmation && <p className="text-xs text-red-500 mt-1">{errors.password_confirmation.message}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Role *</label>
              <div className="space-y-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setValue("role", r.value, { shouldValidate: true })}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      watchedRole === r.value ? "border-[#5A0E24] bg-[#5A0E24]/5" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${watchedRole === r.value ? "border-[#5A0E24] bg-[#5A0E24]" : "border-slate-300"}`}>
                      {watchedRole === r.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${watchedRole === r.value ? "text-[#5A0E24]" : "text-slate-700"}`}>{r.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
            </div>

            {inviteMutation.isError && (
              <p className="text-xs text-red-500">Failed to send invitation. Please try again.</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={!isValid || inviteMutation.isPending}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-40 transition-colors"
              >
                {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
