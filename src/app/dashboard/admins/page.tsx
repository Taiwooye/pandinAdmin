"use client";

import { useState } from "react";

type AdminRole = "Manager" | "Receptionist";
type AdminStatus = "active" | "pending";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  joinedAt: string;
}

type PermissionKey =
  | "view_bookings"
  | "manage_bookings"
  | "verify_payments"
  | "view_earnings"
  | "manage_rooms"
  | "manage_apartments"
  | "manage_lounge_menu"
  | "invite_admins";

interface Permission {
  key: PermissionKey;
  label: string;
  desc: string;
}

type RolePermissions = Record<PermissionKey, boolean>;

const PERMISSIONS: Permission[] = [
  { key: "view_bookings",      label: "View Bookings",       desc: "See all booking records and guest details" },
  { key: "manage_bookings",    label: "Manage Bookings",     desc: "Update booking info and check-in/out dates" },
  { key: "verify_payments",    label: "Verify Payments",     desc: "Toggle payment verified status on bookings" },
  { key: "view_earnings",      label: "View Earnings",       desc: "Access revenue reports and earnings overview" },
  { key: "manage_rooms",       label: "Manage Rooms",        desc: "Edit room prices, availability, and details" },
  { key: "manage_apartments",  label: "Manage Apartments",   desc: "Edit apartment availability and pricing" },
  { key: "manage_lounge_menu", label: "Manage Lounge Menu",  desc: "Add, edit, or remove lounge menu items" },
  { key: "invite_admins",      label: "Invite Admins",       desc: "Invite new team members to the portal" },
];

const DEFAULT_PERMISSIONS: Record<"Manager" | "Receptionist", RolePermissions> = {
  Manager: {
    view_bookings:      true,
    manage_bookings:    true,
    verify_payments:    true,
    view_earnings:      true,
    manage_rooms:       true,
    manage_apartments:  true,
    manage_lounge_menu: true,
    invite_admins:      true,
  },
  Receptionist: {
    view_bookings:      true,
    manage_bookings:    true,
    verify_payments:    false,
    view_earnings:      false,
    manage_rooms:       false,
    manage_apartments:  false,
    manage_lounge_menu: false,
    invite_admins:      false,
  },
};

const ROLES: { value: AdminRole; desc: string }[] = [
  { value: "Manager",      desc: "Full access — manage everything including bookings, rooms, menu, and other admins" },
  { value: "Receptionist", desc: "View and update bookings only" },
];

const ROLE_COLORS: Record<AdminRole, string> = {
  Manager:        "bg-[#5A0E24]/10 text-[#5A0E24]",
  Receptionist:   "bg-amber-50 text-amber-700",
};

// Simulated current logged-in user role
const CURRENT_USER_ROLE: AdminRole = "Manager";

const INITIAL_ADMINS: AdminUser[] = [
  {
    id: "a1",
    name: "Adaeze Nwosu",
    email: "adaeze.nwosu@pandinhotels.com",
    role: "Manager",
    status: "active",
    joinedAt: "2026-01-01",
  },
  {
    id: "a2",
    name: "Emeka Okafor",
    email: "emeka.okafor@pandinhotels.com",
    role: "Receptionist",
    status: "active",
    joinedAt: "2026-02-14",
  },
  {
    id: "a3",
    name: "Funmilayo Adeyemi",
    email: "funmi.adeyemi@pandinhotels.com",
    role: "Receptionist",
    status: "active",
    joinedAt: "2026-03-05",
  },
];

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS);
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("Receptionist");
  const [sent, setSent] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>("Receptionist");

  // Permissions state — Manager and Receptionist only
  const [permissions, setPermissions] = useState<Record<"Manager" | "Receptionist", RolePermissions>>(DEFAULT_PERMISSIONS);
  const [permSaved, setPermSaved] = useState(false);

  const activeAdmins = admins.filter((a) => a.status === "active");
  const pendingAdmins = admins.filter((a) => a.status === "pending");

  const canManagePermissions = CURRENT_USER_ROLE === "Manager";

  function sendInvite() {
    if (!name.trim() || !email.trim()) return;
    const newAdmin: AdminUser = {
      id: `a${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      status: "pending",
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    setAdmins((prev) => [...prev, newAdmin]);
    setSent(email.trim());
    setName(""); setEmail(""); setRole("Receptionist");
    setShowInvite(false);
  }

  function removeAdmin(id: string) {
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  }

  function saveRole(id: string) {
    setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, role: editRole } : a));
    setEditingId(null);
  }

  function resendInvite(email: string) {
    setSent(email);
    setTimeout(() => setSent(null), 3000);
  }

  function togglePermission(role: "Manager" | "Receptionist", key: PermissionKey) {
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: !prev[role][key] },
    }));
    setPermSaved(false);
  }

  function savePermissions() {
    setPermSaved(true);
    setTimeout(() => setPermSaved(false), 3000);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Team</h1>
          <p className="text-slate-500 text-sm mt-1">Manage who has access to this admin portal and what they can do.</p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setSent(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Admin
        </button>
      </div>

      {/* Sent toast */}
      {sent && (
        <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Invitation sent to <span className="font-semibold">{sent}</span>
          <button onClick={() => setSent(null)} className="ml-auto text-green-400 hover:text-green-600">
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
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-2 ${ROLE_COLORS[r.value]}`}>{r.value}</span>
            <p className="text-xs text-slate-400 leading-snug">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Active admins */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h2 className="font-semibold text-slate-800 text-sm">Active Admins</h2>
          <span className="text-xs text-slate-400 ml-1">{activeAdmins.length}</span>
        </div>
        <div className="divide-y divide-slate-50">
          {activeAdmins.map((admin) => (
            <div key={admin.id} className="px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#5A0E24]/10 flex items-center justify-center text-[#5A0E24] font-bold text-sm shrink-0">
                {admin.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{admin.name}</p>
                <p className="text-xs text-slate-400">{admin.email}</p>
              </div>

              {editingId === admin.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as AdminRole)}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.value}</option>
                    ))}
                  </select>
                  <button onClick={() => saveRole(admin.id)} className="px-3 py-1.5 bg-[#5A0E24] text-white text-xs font-semibold rounded-lg hover:bg-[#921224]">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[admin.role]}`}>{admin.role}</span>
                  {admin.id !== "a1" && (
                    <>
                      <button
                        onClick={() => { setEditingId(admin.id); setEditRole(admin.role); }}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => removeAdmin(admin.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending invitations */}
      {pendingAdmins.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="font-semibold text-slate-800 text-sm">Pending Invitations</h2>
            <span className="text-xs text-slate-400 ml-1">{pendingAdmins.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingAdmins.map((admin) => (
              <div key={admin.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{admin.name}</p>
                  <p className="text-xs text-slate-400">{admin.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[admin.role]}`}>{admin.role}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">Awaiting</span>
                  <button onClick={() => resendInvite(admin.email)} className="px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">Resend</button>
                  <button onClick={() => removeAdmin(admin.id)} className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">Cancel</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Permission Settings ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">Manager Access</span>
        </div>

        {canManagePermissions ? (
          <div className="p-6">
            {/* Saved toast */}
            {permSaved && (
              <div className="mb-5 flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Permissions saved successfully.
              </div>
            )}

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_120px_120px] gap-4 mb-3 px-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Permission</div>
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider text-center">Manager</div>
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider text-center">Receptionist</div>
            </div>

            {/* Permission rows */}
            <div className="divide-y divide-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              {PERMISSIONS.map((p) => (
                <div key={p.key} className="grid grid-cols-[1fr_120px_120px] gap-4 items-center px-4 py-3.5 bg-white hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                  </div>

                  {/* Manager toggle */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => togglePermission("Manager", p.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        permissions.Manager[p.key] ? "bg-blue-600" : "bg-slate-200"
                      }`}
                      role="switch"
                      aria-checked={permissions.Manager[p.key]}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${permissions.Manager[p.key] ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>

                  {/* Receptionist toggle */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => togglePermission("Receptionist", p.key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        permissions.Receptionist[p.key] ? "bg-amber-500" : "bg-slate-200"
                      }`}
                      role="switch"
                      aria-checked={permissions.Receptionist[p.key]}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${permissions.Receptionist[p.key] ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Super Admin note */}
            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Changes apply to all users with that role across the portal.
            </p>

            <div className="mt-5 flex justify-end">
              <button
                onClick={savePermissions}
                className="px-5 py-2.5 bg-[#5A0E24] text-white text-sm font-semibold rounded-xl hover:bg-[#921224] transition-colors"
              >
                Save Permissions
              </button>
            </div>
          </div>
        ) : (
          /* Locked state for Receptionist */
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-600">Access Restricted</p>
            <p className="text-xs text-slate-400 mt-1">Only Managers and above can view or change permission settings.</p>
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-5" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-slate-800">Invite New Admin</h3>
              <p className="text-xs text-slate-400 mt-0.5">An invitation link will be sent to their email.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Full Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amaka Johnson"
                autoFocus
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="amaka@example.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Role *</label>
              <div className="space-y-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      role === r.value ? "border-[#5A0E24] bg-[#5A0E24]/5" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${role === r.value ? "border-[#5A0E24] bg-[#5A0E24]" : "border-slate-300"}`}>
                      {role === r.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${role === r.value ? "text-[#5A0E24]" : "text-slate-700"}`}>{r.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={sendInvite}
                disabled={!name.trim() || !email.trim()}
                className="flex-1 py-2.5 bg-[#5A0E24] text-white font-semibold rounded-xl text-sm hover:bg-[#921224] disabled:opacity-40 transition-colors"
              >
                Send Invitation
              </button>
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
