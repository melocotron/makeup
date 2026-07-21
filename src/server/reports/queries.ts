import "server-only";

import { prisma } from "@/lib/prisma";

import type { ResolvedRange } from "./validators";

// ============================================================================
// REPORTS — read-only aggregation queries
// ============================================================================

/**
 * Decisiones generales de implementación:
 *
 * 1. Usamos `prisma.invoice.aggregate` y `prisma.appointment.groupBy`
 *    en vez de cargar todas las filas y sumar en JS. Esto deja el
 *    trabajo pesado en la base de datos.
 *
 * 2. Para los ingresos, filtramos por `status: PAID` y por `paidAt`
 *    dentro del rango. NO usamos `createdAt` de la factura porque
 *    una factura se puede crear hoy y pagarse la semana que viene.
 *
 * 3. Las fechas se comparan con `gte` y `lte` sobre el campo de
 *    timestamp nativo de la BD (no casteamos a string).
 *
 * 4. Para el chart de línea diaria, optamos por hacer una sola query
 *    `findMany` y agrupar en JS. La razón: Prisma no soporta
 *    `GROUP BY date_trunc` directamente, y la cardinalidad esperada
 *    (90 días * N filas/día) sigue siendo manejable. Si crece, se
 *    puede mover a raw SQL o a un aggregation pipeline.
 *
 * 5. `Decimal` viene como string de Prisma; lo convertimos a number
 *    en el límite del módulo para no contaminar al cliente.
 */

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value === "object" && "toNumber" in (value as object)) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

// ============================================================================
// Revenue summary
// ============================================================================

export interface RevenueSummary {
  totalRevenue: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  netRevenue: number;
  invoiceCount: number;
  averageTicket: number;
}

export async function getRevenueSummary(
  range: ResolvedRange,
): Promise<RevenueSummary> {
  const where = {
    status: "PAID" as const,
    paidAt: { gte: range.from, lte: range.to },
  };

  const [agg, count] = await Promise.all([
    prisma.invoice.aggregate({
      where,
      _sum: {
        total: true,
        discountAmount: true,
        loyaltyDiscount: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  const totalRevenue = decimalToNumber(agg._sum.total);
  const couponDiscount = decimalToNumber(agg._sum.discountAmount);
  const loyaltyDiscount = decimalToNumber(agg._sum.loyaltyDiscount);
  // El neto descuenta los descuentos aplicados al subtotal. Los
  // descuentos ya están restados del `total`, así que la métrica
  // "descuentos totales" se reporta por separado y el "neto" es el
  // `total` final que efectivamente cobró el negocio.
  const netRevenue = totalRevenue;
  const averageTicket = count > 0 ? totalRevenue / count : 0;

  return {
    totalRevenue,
    couponDiscount,
    loyaltyDiscount,
    netRevenue,
    invoiceCount: count,
    averageTicket,
  };
}

// ============================================================================
// Appointments summary
// ============================================================================

export interface AppointmentsSummary {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  confirmed: number;
  completionRate: number; // 0..1
  cancellationRate: number; // 0..1
  noShowRate: number; // 0..1
}

export async function getAppointmentsSummary(
  range: ResolvedRange,
): Promise<AppointmentsSummary> {
  const where = {
    scheduledAt: { gte: range.from, lte: range.to },
  };

  const grouped = await prisma.appointment.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }

  const total =
    (counts.PENDING ?? 0) +
    (counts.CONFIRMED ?? 0) +
    (counts.COMPLETED ?? 0) +
    (counts.CANCELLED ?? 0) +
    (counts.NO_SHOW ?? 0);

  const safe = (n: number) => (total > 0 ? n / total : 0);

  return {
    total,
    completed: counts.COMPLETED ?? 0,
    cancelled: counts.CANCELLED ?? 0,
    noShow: counts.NO_SHOW ?? 0,
    pending: counts.PENDING ?? 0,
    confirmed: counts.CONFIRMED ?? 0,
    completionRate: safe(counts.COMPLETED ?? 0),
    cancellationRate: safe(counts.CANCELLED ?? 0),
    noShowRate: safe(counts.NO_SHOW ?? 0),
  };
}

// ============================================================================
// Customers summary
// ============================================================================

export interface CustomersSummary {
  newCustomers: number;
  returningCustomers: number; // >=2 citas en el rango
  totalActive: number; // clientes con al menos 1 cita
}

export async function getCustomersSummary(
  range: ResolvedRange,
): Promise<CustomersSummary> {
  const where = {
    scheduledAt: { gte: range.from, lte: range.to },
  };

  // Clientes nuevos = su primera cita cae dentro del rango.
  const newCustomers = await prisma.client.count({
    where: {
      appointments: {
        some: { scheduledAt: { gte: range.from, lte: range.to } },
      },
      // registeredAt dentro del rango. Aproximación: si su
      // registeredAt es anterior al rango pero tuvo citas, no
      // cuentan como nuevos. Hacemos un count con AND.
      registeredAt: { gte: range.from, lte: range.to },
    },
  });

  // groupBy por client para contar citas por cliente en el rango.
  const perClient = await prisma.appointment.groupBy({
    by: ["clientId"],
    where,
    _count: { _all: true },
  });

  let totalActive = 0;
  let returningCustomers = 0;
  for (const row of perClient) {
    totalActive += 1;
    if (row._count._all >= 2) returningCustomers += 1;
  }

  return { newCustomers, returningCustomers, totalActive };
}

// ============================================================================
// Loyalty summary
// ============================================================================

export interface LoyaltySummary {
  pointsEarned: number;
  pointsRedeemed: number; // reportado como valor absoluto
  redemptionValue: number; // dinero equivalente descontado por redenciones
  redemptionCount: number;
}

export async function getLoyaltySummary(
  range: ResolvedRange,
): Promise<LoyaltySummary> {
  // Puntos generados (EARNED) y canjeados (REDEEMED) en el rango.
  // Asumimos convención del módulo loyalty: type es string y los
  // puntos positivos significan "ganados", negativos "canjeados".
  // (Si la convención fuera otra, se ajusta acá.)
  const txs = await prisma.loyaltyTransaction.findMany({
    where: {
      createdAt: { gte: range.from, lte: range.to },
    },
    select: { type: true, points: true },
  });

  let pointsEarned = 0;
  let pointsRedeemed = 0;
  let redemptionCount = 0;

  for (const tx of txs) {
    if (tx.type === "EARNED") pointsEarned += tx.points;
    if (tx.type === "REDEEMED") {
      pointsRedeemed += Math.abs(tx.points);
      redemptionCount += 1;
    }
  }

  // Para el valor monetario equivalente, sumamos `loyaltyDiscount`
  // de las facturas PAID en el rango.
  const agg = await prisma.invoice.aggregate({
    where: {
      status: "PAID",
      paidAt: { gte: range.from, lte: range.to },
    },
    _sum: { loyaltyDiscount: true },
  });

  return {
    pointsEarned,
    pointsRedeemed,
    redemptionValue: decimalToNumber(agg._sum.loyaltyDiscount),
    redemptionCount,
  };
}

// ============================================================================
// Daily revenue series (for line chart)
// ============================================================================

export interface DailyRevenuePoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  invoiceCount: number;
}

/**
 * Devuelve un array con un punto por día del rango. Días sin
 * facturas se devuelven con revenue=0 para que el chart no tenga
 * gaps visuales.
 */
export async function getDailyRevenueSeries(
  range: ResolvedRange,
): Promise<DailyRevenuePoint[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: range.from, lte: range.to },
    },
    select: { paidAt: true, total: true },
  });

  // Inicializar todos los días del rango con 0.
  const buckets = new Map<string, { revenue: number; count: number }>();
  const cursor = new Date(
    Date.UTC(
      range.from.getUTCFullYear(),
      range.from.getUTCMonth(),
      range.from.getUTCDate(),
    ),
  );
  const end = new Date(
    Date.UTC(
      range.to.getUTCFullYear(),
      range.to.getUTCMonth(),
      range.to.getUTCDate(),
    ),
  );
  while (cursor.getTime() <= end.getTime()) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.set(key, { revenue: 0, count: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Acumular cada factura en su bucket (en UTC).
  for (const inv of invoices) {
    if (!inv.paidAt) continue;
    const key = inv.paidAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue += decimalToNumber(inv.total);
    bucket.count += 1;
  }

  return Array.from(buckets.entries()).map(([date, b]) => ({
    date,
    revenue: Math.round(b.revenue * 100) / 100,
    invoiceCount: b.count,
  }));
}

// ============================================================================
// Top services (for bar chart + table)
// ============================================================================

export interface TopServiceRow {
  serviceId: string;
  serviceName: string; // nombre en español (fallback al campo crudo)
  revenue: number;
  invoiceCount: number;
  appointmentCount: number;
}

export async function getTopServices(
  range: ResolvedRange,
  limit = 5,
): Promise<TopServiceRow[]> {
  // Sumamos el `total` de cada InvoiceItem (que tiene unitPrice y
  // quantity). Filtramos por facturas PAID en el rango y
  // restringimos a items con serviceId no nulo.
  const items = await prisma.invoiceItem.findMany({
    where: {
      serviceId: { not: null },
      invoice: {
        status: "PAID",
        paidAt: { gte: range.from, lte: range.to },
      },
    },
    select: {
      serviceId: true,
      total: true,
      service: { select: { id: true, name: true } },
    },
  });

  // También queremos el número de citas por servicio. Una query
  // separada es más clara que intentar fusionar las dos.
  const apptGroups = await prisma.appointment.groupBy({
    by: ["serviceId"],
    where: {
      scheduledAt: { gte: range.from, lte: range.to },
    },
    _count: { _all: true },
  });

  const apptCountByService = new Map<string, number>();
  for (const row of apptGroups) {
    apptCountByService.set(row.serviceId, row._count._all);
  }

  const byService = new Map<
    string,
    { name: string; revenue: number; invoiceCount: number }
  >();
  for (const item of items) {
    if (!item.serviceId) continue;
    const existing = byService.get(item.serviceId) ?? {
      name: extractSpanishName(item.service?.name),
      revenue: 0,
      invoiceCount: 0,
    };
    existing.revenue += decimalToNumber(item.total);
    existing.invoiceCount += 1;
    byService.set(item.serviceId, existing);
  }

  const rows: TopServiceRow[] = Array.from(byService.entries()).map(
    ([serviceId, data]) => ({
      serviceId,
      serviceName: data.name,
      revenue: Math.round(data.revenue * 100) / 100,
      invoiceCount: data.invoiceCount,
      appointmentCount: apptCountByService.get(serviceId) ?? 0,
    }),
  );

  rows.sort((a, b) => b.revenue - a.revenue);
  return rows.slice(0, limit);
}

// ============================================================================
// Helpers
// ============================================================================

function extractSpanishName(name: unknown): string {
  if (!name || typeof name !== "object") return "—";
  const obj = name as Record<string, unknown>;
  const es = obj.es;
  if (typeof es === "string" && es.length > 0) return es;
  const en = obj.en;
  if (typeof en === "string" && en.length > 0) return en;
  return "—";
}
