"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyRevenuePoint, TopServiceRow } from "@/server/reports/queries";

// ============================================================================
// Charts
// ============================================================================

// Paleta coherente con el sistema de diseño (usa accent color cuando es
// posible). Mantenemos una paleta local para que los charts no dependan
// de CSS variables no definidas en SSR.
const PALETTE = {
  primary: "#4648d4", // accent por defecto (Settings.accentColor)
  primaryLight: "#7d7ee8",
  amber: "#f59e0b",
  rose: "#ef4444",
  emerald: "#10b981",
  slate: "#64748b",
  grid: "rgba(15, 23, 42, 0.08)",
  axis: "rgba(15, 23, 42, 0.6)",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: PALETTE.amber,
  CONFIRMED: PALETTE.primary,
  COMPLETED: PALETTE.emerald,
  CANCELLED: PALETTE.rose,
  NO_SHOW: PALETTE.slate,
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No-show",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(date: string): string {
  // date is YYYY-MM-DD. Show as "5 Jul" in es-MX locale.
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// ============================================================================
// Daily revenue line chart
// ============================================================================

export interface RevenueChartProps {
  data: DailyRevenuePoint[];
  emptyLabel: string;
}

export function RevenueChart({ data, emptyLabel }: RevenueChartProps) {
  const hasData = data.some((p) => p.revenue > 0);

  if (!hasData) {
    return (
      <div
        role="img"
        aria-label={emptyLabel}
        className="flex h-64 items-center justify-center rounded-md border border-dashed border-outline-variant text-sm text-on-surface-variant"
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="h-64 w-full" aria-label={emptyLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
          <XAxis
            dataKey="date"
            stroke={PALETTE.axis}
            tick={{ fontSize: 11 }}
            tickFormatter={formatShortDate}
            minTickGap={24}
          />
          <YAxis
            stroke={PALETTE.axis}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
            }
            width={60}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            labelFormatter={formatShortDate}
            formatter={(value: number) => [formatCurrency(value), "Ingresos"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={PALETTE.primary}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Top services bar chart
// ============================================================================

export interface ServicesChartProps {
  data: TopServiceRow[];
  emptyLabel: string;
}

export function ServicesChart({ data, emptyLabel }: ServicesChartProps) {
  if (data.length === 0) {
    return (
      <div
        role="img"
        aria-label={emptyLabel}
        className="flex h-64 items-center justify-center rounded-md border border-dashed border-outline-variant text-sm text-on-surface-variant"
      >
        {emptyLabel}
      </div>
    );
  }

  // El nombre del servicio puede ser largo: lo truncamos para el eje Y.
  const truncated = data.map((d) => ({
    ...d,
    shortName: d.serviceName.length > 22
      ? `${d.serviceName.slice(0, 22)}…`
      : d.serviceName,
  }));

  return (
    <div className="h-64 w-full" aria-label={emptyLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={truncated}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.grid} />
          <XAxis
            type="number"
            stroke={PALETTE.axis}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
            }
          />
          <YAxis
            type="category"
            dataKey="shortName"
            stroke={PALETTE.axis}
            tick={{ fontSize: 11 }}
            width={140}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            formatter={(value: number) => [formatCurrency(value), "Ingresos"]}
            labelFormatter={(label: string) => label.replace("…", "")}
          />
          <Bar dataKey="revenue" fill={PALETTE.primary} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Appointment status pie chart
// ============================================================================

export interface StatusChartDatum {
  status: keyof typeof STATUS_COLORS;
  count: number;
  [key: string]: string | number;
}

export interface StatusChartProps {
  data: StatusChartDatum[];
  emptyLabel: string;
}

export function StatusChart({ data, emptyLabel }: StatusChartProps) {
  const filtered = data.filter((d) => d.count > 0);

  if (filtered.length === 0) {
    return (
      <div
        role="img"
        aria-label={emptyLabel}
        className="flex h-64 items-center justify-center rounded-md border border-dashed border-outline-variant text-sm text-on-surface-variant"
      >
        {emptyLabel}
      </div>
    );
  }

  const total = filtered.reduce((s, d) => s + d.count, 0);

  return (
    <div className="h-64 w-full" aria-label={emptyLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => {
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return [`${value} (${pct}%)`, name];
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={32}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
          <Pie
            data={filtered}
            dataKey="count"
            nameKey="status"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
          >
            {filtered.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? PALETTE.slate}
              />
            ))}
          </Pie>
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}

export { STATUS_COLORS, STATUS_LABELS };
