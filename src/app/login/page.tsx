"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const ok = login(email, password);
    if (ok) {
      router.push("/dashboard");
    } else {
      setError("Invalid email or password.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-[#C41230]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14M9 21V12h6v9M3 10h18" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg">PaNDiN Group</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage your<br />hospitality empire<br />from one place.
          </h1>
          <p className="text-white/70 text-lg">Bookings, rooms, lounge menu, gallery — all under control.</p>
        </div>
        <p className="text-white/40 text-sm">© 2026 PaNDiN Group Admin Portal</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#C41230] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14M9 21V12h6v9M3 10h18" />
              </svg>
            </div>
            <span className="text-white font-bold">PaNDiN Admin</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
          <p className="text-slate-400 text-sm mb-8">Enter your admin credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C41230] focus:border-transparent"
                placeholder="admin@pandingroup.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C41230] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2.5 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C41230] text-white font-semibold rounded-xl hover:bg-[#9C0E25] transition-colors disabled:opacity-60 text-sm"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-slate-600 text-xs mt-8">
            For access, contact the PaNDiN system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
