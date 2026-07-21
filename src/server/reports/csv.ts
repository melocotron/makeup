import Papa from "papaparse";

import { CURRENCY_FMT, shortDate, dateTime } from "@/components/admin/reports/tables";
import {
  getAppointmentsSummary,
  getCouponRedemptions,
  getCustomersSummary,
  getDailyRevenueSeries,
  getLoyaltySummary,
  getRecentAppointments,
  getRecentInvoices,
  getRevenueSummary,
  getTopClients,
  getTopServices,
} from "./queries";
import type { ResolvedRange } from "./validators";

// ============================================================================
// CSV export
// ============================================================================

/**
 * Serializa un report completo (KPIs + tablas) a CSV.
 *
 * Decisión: usamos un único CSV con múltiples secciones, separadas por
 * líneas en blanco y un encabezado de sección. Es la opción más simple
 * para importar en Excel/Google Sheets sin perder el contexto.
 *
 * Si en el futuro hace falta un Excel multi-hoja, se reemplaza esta
 * función por `writeXLSX` o `writeMultipleCSV`.
 */

const CURRENCY = CURRENCY_FMT;
const DATE = shortDate;
const DATETIME = dateTime;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T & string; header: string }>,
): string {
  const header = columns.map((c) => csvEscape(c.header)).join(",");
  const body = rows
    .map((row) => columns.map((c) => csvEscape(row[c.key])).join(","))
    .join("\n");
  return [header, body].filter(Boolean).join("\n");
}

export async function buildReportCsv(
  range: ResolvedRange,
  presetLabel: string,
): Promise<string> {
  const [
    revenue,
    appointments,
    customers,
    loyalty,
    dailyRevenue,
    topServices,
    topClients,
    recentAppointments,
    recentInvoices,
    couponRedemptions,
  ] = await Promise.all([
    getRevenueSummary(range),
    getAppointmentsSummary(range),
    getCustomersSummary(range),
    getLoyaltySummary(range),
    getDailyRevenueSeries(range),
    getTopServices(range, 100),
    getTopClients(range, { pageSize: 100, page: 1 }),
    getRecentAppointments(range, { pageSize: 100, page: 1 }),
    getRecentInvoices(range, { pageSize: 100, page: 1 }),
    getCouponRedemptions(range, { pageSize: 100, page: 1 }),
  ]);

  const sections: string[] = [];

  // Header / metadata
  sections.push(
    toCsv(
      [
        {
          report: "Radiant Beauty — Reportes",
          rango: `${DATE(range.from.toISOString())} → ${DATE(range.to.toISOString())}`,
          preset: presetLabel,
          generado: DATETIME(new Date().toISOString()),
        },
      ],
      [
        { key: "report", header: "Reporte" },
        { key: "rango", header: "Rango" },
        { key: "preset", header: "Preset" },
        { key: "generado", header: "Generado" },
      ],
    ),
  );

  // KPIs
  sections.push(
    toCsv(
      [
        {
          totalRevenue: CURRENCY.format(revenue.totalRevenue),
          couponDiscount: CURRENCY.format(revenue.couponDiscount),
          loyaltyDiscount: CURRENCY.format(revenue.loyaltyDiscount),
          averageTicket: CURRENCY.format(revenue.averageTicket),
          invoiceCount: revenue.invoiceCount,
        },
      ],
      [
        { key: "totalRevenue", header: "Ingresos totales" },
        { key: "couponDiscount", header: "Descuento cupones" },
        { key: "loyaltyDiscount", header: "Descuento fidelidad" },
        { key: "averageTicket", header: "Ticket promedio" },
        { key: "invoiceCount", header: "Facturas pagadas" },
      ],
    ),
  );

  sections.push(
    toCsv(
      [
        {
          total: appointments.total,
          completed: appointments.completed,
          cancelled: appointments.cancelled,
          noShow: appointments.noShow,
          completionRate: `${Math.round(appointments.completionRate * 100)}%`,
          cancellationRate: `${Math.round(appointments.cancellationRate * 100)}%`,
        },
      ],
      [
        { key: "total", header: "Citas totales" },
        { key: "completed", header: "Completadas" },
        { key: "cancelled", header: "Canceladas" },
        { key: "noShow", header: "No-show" },
        { key: "completionRate", header: "Tasa finalización" },
        { key: "cancellationRate", header: "Tasa cancelación" },
      ],
    ),
  );

  sections.push(
    toCsv(
      [
        {
          newCustomers: customers.newCustomers,
          returningCustomers: customers.returningCustomers,
          totalActive: customers.totalActive,
          pointsEarned: loyalty.pointsEarned,
          pointsRedeemed: loyalty.pointsRedeemed,
          redemptionValue: CURRENCY.format(loyalty.redemptionValue),
        },
      ],
      [
        { key: "newCustomers", header: "Clientes nuevos" },
        { key: "returningCustomers", header: "Recurrentes" },
        { key: "totalActive", header: "Activos" },
        { key: "pointsEarned", header: "Puntos generados" },
        { key: "pointsRedeemed", header: "Puntos canjeados" },
        { key: "redemptionValue", header: "Valor canjeado" },
      ],
    ),
  );

  // Daily revenue series
  sections.push(
    toCsv(
      dailyRevenue.map((p) => ({
        date: p.date,
        revenue: p.revenue,
        invoiceCount: p.invoiceCount,
      })),
      [
        { key: "date", header: "Fecha" },
        { key: "revenue", header: "Ingresos" },
        { key: "invoiceCount", header: "Facturas" },
      ],
    ),
  );

  // Top services
  sections.push(
    toCsv(
      topServices.map((s) => ({
        service: s.serviceName,
        revenue: s.revenue,
        invoices: s.invoiceCount,
        appointments: s.appointmentCount,
      })),
      [
        { key: "service", header: "Servicio" },
        { key: "revenue", header: "Ingresos" },
        { key: "invoices", header: "Facturas" },
        { key: "appointments", header: "Citas" },
      ],
    ),
  );

  // Top clients
  sections.push(
    toCsv(
      topClients.items.map((c) => ({
        name: c.clientName,
        email: c.clientEmail,
        revenue: c.revenue,
        appointments: c.appointmentCount,
        invoices: c.invoiceCount,
        loyaltyPoints: c.loyaltyPoints,
      })),
      [
        { key: "name", header: "Cliente" },
        { key: "email", header: "Email" },
        { key: "revenue", header: "Ingresos" },
        { key: "appointments", header: "Citas" },
        { key: "invoices", header: "Facturas" },
        { key: "loyaltyPoints", header: "Puntos" },
      ],
    ),
  );

  // Recent appointments
  sections.push(
    toCsv(
      recentAppointments.items.map((a) => ({
        scheduledAt: DATETIME(a.scheduledAt),
        client: a.clientName,
        email: a.clientEmail,
        service: a.serviceName,
        status: a.status,
        duration: a.durationMin,
        invoiceStatus: a.invoiceStatus ?? "",
      })),
      [
        { key: "scheduledAt", header: "Fecha y hora" },
        { key: "client", header: "Cliente" },
        { key: "email", header: "Email" },
        { key: "service", header: "Servicio" },
        { key: "status", header: "Estado" },
        { key: "duration", header: "Duración (min)" },
        { key: "invoiceStatus", header: "Estado factura" },
      ],
    ),
  );

  // Recent invoices
  sections.push(
    toCsv(
      recentInvoices.items.map((i) => ({
        number: i.number,
        client: i.clientName,
        service: i.serviceSummary,
        total: i.total,
        subtotal: i.subtotal,
        discount: i.discountAmount,
        loyalty: i.loyaltyDiscount,
        status: i.status,
        createdAt: DATE(i.createdAt),
        paidAt: i.paidAt ? DATE(i.paidAt) : "",
      })),
      [
        { key: "number", header: "Número" },
        { key: "client", header: "Cliente" },
        { key: "service", header: "Servicio" },
        { key: "total", header: "Total" },
        { key: "subtotal", header: "Subtotal" },
        { key: "discount", header: "Descuento" },
        { key: "loyalty", header: "Desc. fidelidad" },
        { key: "status", header: "Estado" },
        { key: "createdAt", header: "Creada" },
        { key: "paidAt", header: "Pagada" },
      ],
    ),
  );

  // Coupon redemptions
  sections.push(
    toCsv(
      couponRedemptions.items.map((u) => ({
        code: u.couponCode,
        client: u.clientName,
        invoice: u.invoiceNumber,
        amount: u.amount,
        usedAt: DATETIME(u.usedAt),
      })),
      [
        { key: "code", header: "Cupón" },
        { key: "client", header: "Cliente" },
        { key: "invoice", header: "Factura" },
        { key: "amount", header: "Monto" },
        { key: "usedAt", header: "Canjeado" },
      ],
    ),
  );

  return sections.join("\n\n");
}

// Re-exportamos la API de papaparse por si la necesitamos en otros formatos
// en el futuro (TSV, etc.).
export { Papa };
