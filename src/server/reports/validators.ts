import { z } from "zod";

// ============================================================================
// REPORTS
// ============================================================================

/**
 * Presets de rango de fechas soportados por la página /admin/reports.
 * Cada preset se traduce a un par (from, to) en el resolver.
 *
 * Decisión: usamos string en vez de enum numérico para que el valor
 * sea legible en query params (`?preset=last30`) y en logs.
 */
export const DATE_PRESETS = [
  "today",
  "last7",
  "last30",
  "last90",
  "ytd",
  "custom",
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

/**
 * Granularidad del eje X en el gráfico de línea de ingresos.
 * "day" para rangos <= 90 días; "week" para YTD; "month" si se pide
 * explícitamente. La heurística vive en el resolver.
 */
export const GROUP_BY = ["day", "week", "month"] as const;
export type GroupBy = (typeof GROUP_BY)[number];

/**
 * Schemas auxiliares.
 */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (formato esperado: YYYY-MM-DD)");

const pageNumber = z.coerce.number().int().min(1).default(1);
const pageSizeNumber = z.coerce.number().int().min(1).max(100).default(20);

/**
 * Filtros principales para /admin/reports y para los endpoints de export.
 *
 * Reglas:
 * - Si preset ≠ "custom", el resolver ignora from/to y los calcula
 *   (defensa: si vienen igual, se validan).
 * - Si preset = "custom", from y to son obligatorios.
 * - from <= to.
 * - El rango máximo es 2 años (defensa contra queries pesadas accidentales).
 * - groupBy es opcional; el resolver decide por heurística si no viene.
 *
 * Decisión: aceptamos strings (no Date) en el schema porque los
 * valores llegan por query params. El resolver los convierte a Date.
 */
const reportFiltersBaseSchema = z.object({
  preset: z.enum(DATE_PRESETS).default("last30"),
  from: isoDate.optional(),
  to: isoDate.optional(),
  groupBy: z.enum(GROUP_BY).optional(),
});

export const reportFiltersSchema = reportFiltersBaseSchema.superRefine(
  (val, ctx) => {
    if (val.preset === "custom") {
      if (!val.from) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["from"],
          message: "Fecha de inicio requerida con preset=custom",
        });
      }
      if (!val.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["to"],
          message: "Fecha de fin requerida con preset=custom",
        });
      }
    }
    if (val.from && val.to) {
      if (val.from > val.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["from"],
          message: "La fecha de inicio no puede ser posterior a la de fin",
        });
      }
      // rango máximo 2 años
      const fromDate = new Date(val.from + "T00:00:00Z");
      const toDate = new Date(val.to + "T00:00:00Z");
      const days = (toDate.getTime() - fromDate.getTime()) / 86_400_000;
      if (days > 730) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["to"],
          message: "El rango no puede superar 2 años",
        });
      }
    }
  },
);

export type ReportFiltersInput = z.infer<typeof reportFiltersBaseSchema>;
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

/**
 * Sort keys para los listados de detalle (top clients, recent invoices, etc.).
 */
export const TOP_CLIENTS_SORT = ["revenue", "appointments", "name"] as const;
export const APPOINTMENTS_SORT = ["scheduledAt", "createdAt", "status"] as const;
export const INVOICES_SORT = ["createdAt", "paidAt", "total", "status"] as const;

/**
 * Filtros para el listado de top clientes.
 * - sortBy: revenue (default) o appointments o name.
 * - page/pageSize para paginación.
 */
export const topClientsFilterSchema = reportFiltersBaseSchema.extend({
  sortBy: z.enum(TOP_CLIENTS_SORT).default("revenue"),
  page: pageNumber,
  pageSize: pageSizeNumber,
});

export type TopClientsFilterInput = z.infer<typeof topClientsFilterSchema>;

/**
 * Filtros para citas recientes.
 * - status opcional (default: todos).
 * - sort: scheduledAt (default) o createdAt o status.
 */
export const appointmentsFilterSchema = reportFiltersBaseSchema.extend({
  status: z
    .enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .optional(),
  sortBy: z.enum(APPOINTMENTS_SORT).default("scheduledAt"),
  page: pageNumber,
  pageSize: pageSizeNumber,
});

export type AppointmentsFilterInput = z.infer<typeof appointmentsFilterSchema>;

/**
 * Filtros para facturas recientes.
 * - status opcional.
 */
export const invoicesFilterSchema = reportFiltersBaseSchema.extend({
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
  sortBy: z.enum(INVOICES_SORT).default("createdAt"),
  page: pageNumber,
  pageSize: pageSizeNumber,
});

export type InvoicesFilterInput = z.infer<typeof invoicesFilterSchema>;

/**
 * Filtros para cupones canjeados.
 * - sortBy: amount (default), usedAt, code.
 */
export const couponRedemptionsFilterSchema = reportFiltersBaseSchema.extend({
  sortBy: z.enum(["amount", "usedAt", "code"]).default("amount"),
  page: pageNumber,
  pageSize: pageSizeNumber,
});

export type CouponRedemptionsFilterInput = z.infer<
  typeof couponRedemptionsFilterSchema
>;

/**
 * Formato de export soportado por los endpoints /api/admin/reports/export.*.
 */
export const EXPORT_FORMATS = ["csv", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * Schema de query params para el endpoint de export.
 * El formato lo define la ruta (export.csv / export.pdf), no el query
 * param, pero dejamos `format` opcional para que el cliente pueda
 * forzar uno (útil si la URL se construye desde un helper compartido).
 */
export const exportQuerySchema = reportFiltersBaseSchema.extend({
  format: z.enum(EXPORT_FORMATS).optional(),
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;

/**
 * Resolver: convierte `reportFiltersInput` en un par (from, to) de Date,
 * aplicando el preset o usando los valores custom.
 *
 * Decisión: este resolver vive en el mismo archivo que los schemas
 * (no en queries.ts) porque es lógica de validación/normalización
 * de input, no de acceso a datos. Si crece, se mueve a un helper
 * aparte.
 */
export interface ResolvedRange {
  from: Date;
  to: Date;
  groupBy: GroupBy;
  preset: DatePreset;
}

export function resolveDateRange(
  input: ReportFiltersInput,
  now: Date = new Date(),
): ResolvedRange {
  const endOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );

  let from: Date;
  let to: Date = endOfToday;

  switch (input.preset) {
    case "today":
      from = startOfToday;
      to = endOfToday;
      break;
    case "last7": {
      from = new Date(startOfToday);
      from.setUTCDate(from.getUTCDate() - 6);
      break;
    }
    case "last30": {
      from = new Date(startOfToday);
      from.setUTCDate(from.getUTCDate() - 29);
      break;
    }
    case "last90": {
      from = new Date(startOfToday);
      from.setUTCDate(from.getUTCDate() - 89);
      break;
    }
    case "ytd": {
      from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      break;
    }
    case "custom": {
      if (!input.from || !input.to) {
        // No debería llegar acá gracias al superRefine, pero TypeScript no lo sabe.
        throw new Error("custom preset requires from and to");
      }
      from = new Date(input.from + "T00:00:00Z");
      to = new Date(input.to + "T23:59:59.999Z");
      break;
    }
  }

  // Heurística de groupBy si no viene explícito.
  let groupBy: GroupBy = input.groupBy ?? "day";
  if (!input.groupBy) {
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    if (days > 180) groupBy = "month";
    else if (days > 60) groupBy = "week";
    else groupBy = "day";
  }

  return { from, to, groupBy, preset: input.preset };
}
