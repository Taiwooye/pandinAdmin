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
import type { EarningsPeriod } from "@/app/dashboard/page";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type EarningsBreakdownItem = { label: string; amount: string | number };

type Earnings = {
  period: string;
  total: number | string;
  average_per_month: number | string;
  peak: number | string;
  breakdown: EarningsBreakdownItem[];
};

const FILTERS: { value: EarningsPeriod; label: string }[] = [
  { value: "7days",   label: "Last 7 Days" },
  { value: "30days",  label: "Last 30 Days" },
  { value: "3months", label: "Last 3 Months" },
  { value: "12months",label: "Last 12 Months" },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toLocaleString()}`;
}

type Props = {
  earnings: Earnings;
  period: EarningsPeriod;
  onPeriodChange: (p: EarningsPeriod) => void;
};

export default function EarningsChart({ earnings, period, onPeriodChange }: Props) {
  const labels = earnings.breakdown.map((b) => b.label);
  const values = earnings.breakdown.map((b) => Number(b.amount));
  const total = Number(earnings.total);
  const peak = Number(earnings.peak);

  const isDaily = period === "7days" || period === "30days";
  const activeBars = values.filter((v) => v > 0).length;

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
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Earnings</h3>
          <p className="text-2xl font-black text-slate-800 mt-1">{fmt(total)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {FILTERS.find((f) => f.value === period)?.label ?? period}
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onPeriodChange(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                period === f.value
                  ? "bg-[#5A0E24] text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: "220px" }}>
        <Bar data={chartData} options={options as Parameters<typeof Bar>[0]["options"]} />
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 pt-4 border-t border-slate-50 text-xs text-slate-500">
        <div>
          <span className="font-semibold text-slate-800">{activeBars}</span>{" "}
          active {isDaily ? "day" : "month"}{activeBars !== 1 ? "s" : ""}
        </div>
        {!isDaily && (
          <div>
            Avg: <span className="font-semibold text-slate-800">{fmt(Number(earnings.average_per_month))}</span> / month
          </div>
        )}
        <div>
          Peak: <span className="font-semibold text-[#5A0E24]">{fmt(peak)}</span>
        </div>
      </div>
    </div>
  );
}
