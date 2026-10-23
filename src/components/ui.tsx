"use client";

// Shared building blocks for admin pages — keep pages simple and consistent
// for staff who aren't technical: plain words, big buttons, clear feedback.

import { useEffect } from "react";

// ─── Page header ──────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  /** One plain sentence explaining what this page is for */
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-slate-500 text-sm mt-1 max-w-2xl">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-[#5A0E24] text-white hover:bg-[#7a1230]",
  secondary: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  const sizing = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizing} ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Cards & badges ───────────────────────────────────────────────────────────

export function Card({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

type BadgeTone = "green" | "amber" | "red" | "slate" | "wine";

const BADGE_STYLES: Record<BadgeTone, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  slate: "bg-slate-200 text-slate-600",
  wine: "bg-[#5A0E24]/10 text-[#5A0E24]",
};

export function Badge({ tone = "slate", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE_STYLES[tone]}`}>{children}</span>;
}

// ─── States ───────────────────────────────────────────────────────────────────

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400 text-sm">{label}</div>;
}

export function ErrorState({ message = "Could not load this page. Check your internet connection and refresh." }: { message?: string }) {
  return <div className="bg-red-50 rounded-2xl border border-red-200 py-10 px-6 text-center text-red-700 text-sm">{message}</div>;
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-14 px-6 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Inline success / error line shown after saving */
export function Feedback({ success, error }: { success?: string; error?: string }) {
  if (error) return <p className="text-sm font-medium text-red-600">{error}</p>;
  if (success) return <p className="text-sm font-medium text-green-700">✓ {success}</p>;
  return null;
}

/** Turns an API error into a sentence staff can act on */
export function errorMessage(err: unknown): string {
  const res = (err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })?.response;
  if (!res) return "Could not reach the server. Check your internet connection and try again.";
  if (res.status === 403) return "You don't have permission to do this. Ask a manager.";
  const firstFieldError = res.data?.errors ? Object.values(res.data.errors)[0]?.[0] : undefined;
  return firstFieldError ?? res.data?.message ?? "Something went wrong. Please try again.";
}

// ─── Overlays ─────────────────────────────────────────────────────────────────

function useEscape(onClose: () => void, isDialog = false) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // When a confirm dialog is open on top, only the dialog closes
      if (!isDialog && document.querySelector("[data-confirm-dialog]")) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, isDialog]);
}

/** Slide-in panel from the right, used for add/edit forms and details */
export function SidePanel({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Sticky footer, usually the Save / Cancel buttons */
  footer?: React.ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 md:px-8 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xl leading-none">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">{children}</div>
        {footer && <div className="px-6 md:px-8 py-4 border-t border-slate-100 bg-slate-50">{footer}</div>}
      </div>
    </div>
  );
}

/** "Are you sure?" box for deleting or other actions that can't be undone */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Yes, delete",
  cancelLabel = "No, keep it",
  onConfirm,
  onCancel,
  busy = false,
  error,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string;
}) {
  useEscape(onCancel, true);
  return (
    <div data-confirm-dialog className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl mb-4">⚠️</div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-600 mt-1">{message}</p>
        {error && <p className="text-sm font-medium text-red-600 mt-3">{error}</p>}
        <div className="flex gap-2 mt-6">
          <Button variant="danger" onClick={onConfirm} disabled={busy} className="flex-1">
            {busy ? "Working…" : confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={busy} className="flex-1">
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Form fields ──────────────────────────────────────────────────────────────

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5A0E24]/25 focus:border-[#5A0E24]";

export const inputClass = INPUT_CLASS;

/** Label + optional hint + the control */
export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  /** Short help text under the label, e.g. "Shown on the website" */
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLASS} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${INPUT_CLASS} resize-none ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${INPUT_CLASS} ${props.className ?? ""}`} />;
}

/** Big on/off switch with a sentence describing what "on" means */
export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 text-left hover:bg-slate-50"
    >
      <span>
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        {description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
      </span>
      <span className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${checked ? "bg-emerald-600" : "bg-slate-300"}`}>
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

/** Type-and-press-Enter list editor, e.g. room features */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
  };
  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-slate-100 text-sm text-slate-700">
              {t}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                className="w-5 h-5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        placeholder={placeholder}
        className={INPUT_CLASS}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
        onBlur={(e) => {
          add(e.currentTarget.value);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
