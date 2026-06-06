"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ── Mock earnings data ────────────────────────────────────────────────────────
// Daily earnings for Apr 26 – May 25 2026 (30 days)
const DAILY_RAW: { date: string; value: number }[] = [
  { date: "2026-04-26", value: 78000 },
  { date: "2026-04-27", value: 0 },
  { date: "2026-04-28", value: 160000 },
  { date: "2026-04-29", value: 45000 },
  { date: "2026-04-30", value: 220000 },
  { date: "2026-05-01", value: 390000 },
  { date: "2026-05-02", value: 180000 },
  { date: "2026-05-03", value: 0 },
  { date: "2026-05-04", value: 95000 },
  { date: "2026-05-05", value: 430000 },
  { date: "2026-05-06", value: 260000 },
  { date: "2026-05-07", value: 320000 },
  { date: "2026-05-08", value: 0 },
  { date: "2026-05-09", value: 145000 },
  { date: "2026-05-10", value: 520000 },
  { date: "2026-05-11", value: 385000 },
  { date: "2026-05-12", value: 60000 },
  { date: "2026-05-13", value: 200000 },
  { date: "2026-05-14", value: 0 },
  { date: "2026-05-15", value: 740000 },
  { date: "2026-05-16", value: 310000 },
  { date: "2026-05-17", value: 180000 },
  { date: "2026-05-18", value: 95000 },
  { date: "2026-05-19", value: 0 },
  { date: "2026-05-20", value: 66000 },
  { date: "2026-05-21", value: 0 },
  { date: "2026-05-22", value: 150000 },
  { date: "2026-05-23", value: 480000 },
  { date: "2026-05-24", value: 1120000 },
  { date: "2026-05-25", value: 180000 },
];

// Monthly earnings for Jan – Dec 2026 (latter months projected)
const MONTHLY_RAW: { month: string; value: number }[] = [
  { month: "Jan 2026", value: 2400000 },
  { month: "Feb 2026", value: 1850000 },
  { month: "Mar 2026", value: 3200000 },
  { month: "Apr 2026", value: 2950000 },
  { month: "May 2026", value: 4100000 },
  { month: "Jun 2026", value: 1200000 },
  { month: "Jul 2026", value: 0 },
  { month: "Aug 2026", value: 0 },
  { month: "Sep 2026", value: 0 },
  { month: "Oct 2026", value: 0 },
  { month: "Nov 2026", value: 0 },
  { month: "Dec 2026", value: 0 },
];

// ── Filter options ────────────────────────────────────────────────────────────
type FilterKey = "7d" | "14d" | "30d" | "3m" | "6m" | "12m";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "7d",  label: "Last 7 days" },
  { key: "14d", label: "Last 14 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "3m",  label: "Last 3 months" },
  { key: "6m",  label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
];

function isMonthly(k: FilterKey) {
  return k === "3m" || k === "6m" || k === "12m";
}

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EarningsChart() {
  const [filter, setFilter] = useState<FilterKey>("6m");

  const { labels, values, total } = useMemo(() => {
    let items: { label: string; value: number }[];

    if (isMonthly(filter)) {
      const count = filter === "3m" ? 3 : filter === "6m" ? 6 : 12;
      const slice = MONTHLY_RAW.slice(0, count);
      items = slice.map((m) => ({ label: m.month.split(" ")[0], value: m.value }));
    } else {
      const count = filter === "7d" ? 7 : filter === "14d" ? 14 : 30;
      const slice = DAILY_RAW.slice(-count);
      items = slice.map((d) => {
        const dt = new Date(d.date);
        const label = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        return { label, value: d.value };
      });
    }

    const total = items.reduce((s, i) => s + i.value, 0);
    return {
      labels: items.map((i) => i.label),
      values: items.map((i) => i.value),
      total,
    };
  }, [filter]);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Earnings (₦)",
        data: values,
        backgroundColor: values.map((v) =>
          v === 0 ? "rgba(226, 232, 240, 0.7)" : "rgba(90, 14, 36, 0.85)"
        ),
        hoverBackgroundColor: values.map((v) =>
          v === 0 ? "rgba(226, 232, 240, 1)" : "rgba(90, 14, 36, 1)"
        ),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) => ` ${fmt(ctx.parsed.y)}`,
        },
        backgroundColor: "#1E293B",
        titleColor: "#94A3B8",
        bodyColor: "#F8FAFC",
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: "#94A3B8",
          font: { size: 11 },
          maxRotation: isMonthly(filter) ? 0 : 45,
        },
      },
      y: {
        border: { display: false, dash: [4, 4] },
        grid: { color: "#F1F5F9" },
        ticks: {
          color: "#94A3B8",
          font: { size: 11 },
          callback: (v: number | string) => fmt(Number(v)),
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Earnings</h3>
          <p className="text-2xl font-black text-slate-800 mt-1">{fmt(total)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {FILTERS.find((f) => f.key === filter)?.label}
          </p>
        </div>

        {/* Dropdown filter */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterKey)}
            className="appearance-none pl-3.5 pr-8 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            <optgroup label="Daily">
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </optgroup>
            <optgroup label="Monthly">
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="12m">Last 12 months</option>
            </optgroup>
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "220px" }}>
        <Bar data={chartData} options={options as Parameters<typeof Bar>[0]["options"]} />
      </div>

      {/* Summary row */}
      <div className="flex gap-6 mt-4 pt-4 border-t border-slate-50 text-xs text-slate-500">
        <div>
          <span className="font-semibold text-slate-800">{values.filter((v) => v > 0).length}</span>
          {" "}active {isMonthly(filter) ? "months" : "days"}
        </div>
        <div>
          Avg: <span className="font-semibold text-slate-800">{fmt(Math.round(total / Math.max(values.filter((v) => v > 0).length, 1)))}</span>
          {" "}/ {isMonthly(filter) ? "month" : "day"}
        </div>
        <div>
          Peak: <span className="font-semibold text-[#5A0E24]">{fmt(Math.max(...values))}</span>
        </div>
      </div>
    </div>
  );
}
