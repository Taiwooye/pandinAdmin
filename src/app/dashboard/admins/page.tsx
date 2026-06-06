"use client";

import { useState } from "react";

type AdminRole = "Super Admin" | "Manager" | "Receptionist" | "View Only";
type AdminStatus = "active" | "pending";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  joinedAt: string;
}

const ROLES: { value: AdminRole; desc: string }[] = [
  { value: "Super Admin", desc: "Full access — manage everything including other admins" },
  { value: "Manager", desc: "Manage bookings, rooms, apartments, and menu" },
  { value: "Receptionist", desc: "View and update bookings only" },
  { value: "View Only", desc: "Read-only access to all sections" },
];

const ROLE_COLORS: Record<AdminRole, string> = {
  "Super Admin": "bg-[#5A0E24]/10 text-[#5A0E24]",
  Manager: "bg-blue-50 text-blue-700",
  Receptionist: "bg-amber-50 text-amber-700",
  "View Only": "bg-slate-100 text-slate-500",
};

const INITIAL_ADMINS: AdminUser[] = [
  {
    id: "a1",
    name: "Taiwo Oyedokun",
    email: "oyedokuntaiwo96@gmail.com",
    role: "Super Admin",
    status: "active",
    joinedAt: "2026-01-01",
  },
];

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS);
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("Receptionist");
  const [sent, setSent] = useState<string | null>(null);

  // Edit role
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>("Receptionist");

  const activeAdmins = admins.filter((a) => a.status === "active");
  const pendingAdmins = admins.filter((a) => a.status === "pending");

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

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Team</h1>
          <p className="text-slate-500 text-sm mt-1">Manage who has access to this admin portal.</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
                  {admin.role !== "Super Admin" && (
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                  <button
                    onClick={() => resendInvite(admin.email)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => removeAdmin(admin.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                {ROLES.filter((r) => r.value !== "Super Admin").map((r) => (
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
