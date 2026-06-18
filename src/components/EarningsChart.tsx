"use client";

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

type EarningsBreakdownItem = { label: string; amount: string | number };

type Earnings = {
  period: string;
  total: number | string;
  average_per_month: number | string;
  peak: number | string;
  breakdown: EarningsBreakdownItem[];
};

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

function periodLabel(period: string) {
  const match = period.match(/^(\d+)months?$/);
  if (match) return `Last ${match[1]} months`;
  return period;
}

export default function EarningsChart({ earnings }: { earnings: Earnings }) {
  const labels = earnings.breakdown.map((b) => b.label);
  const values = earnings.breakdown.map((b) => Number(b.amount));
  const total = Number(earnings.total);
  const peak = Number(earnings.peak);
  const activeMonths = values.filter((v) => v > 0).length;

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
        ticks: { color: "#94A3B8", font: { size: 11 } },
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
      <div className="mb-5">
        <h3 className="font-semibold text-slate-800 text-sm">Earnings</h3>
        <p className="text-2xl font-black text-slate-800 mt-1">{fmt(total)}</p>
        <p className="text-xs text-slate-400 mt-0.5">{periodLabel(earnings.period)}</p>
      </div>

      {/* Chart */}
      <div style={{ height: "220px" }}>
        <Bar data={chartData} options={options as Parameters<typeof Bar>[0]["options"]} />
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 pt-4 border-t border-slate-50 text-xs text-slate-500">
        <div>
          <span className="font-semibold text-slate-800">{activeMonths}</span> active months
        </div>
        <div>
          Avg: <span className="font-semibold text-slate-800">{fmt(Number(earnings.average_per_month))}</span> / month
        </div>
        <div>
          Peak: <span className="font-semibold text-[#5A0E24]">{fmt(peak)}</span>
        </div>
      </div>
    </div>
  );
}
