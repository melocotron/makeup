import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/server/auth";
import { buildReportCsv } from "@/server/reports/csv";
import {
  exportQuerySchema,
  resolveDateRange,
} from "@/server/reports/validators";

export const runtime = "nodejs";

/**
 * GET /api/admin/reports/export.csv
 *
 * Query params (todos opcionales):
 * - preset: today | last7 | last30 | last90 | ytd | custom
 * - from, to: YYYY-MM-DD (requeridos si preset=custom)
 * - groupBy: day | week | month
 *
 * Devuelve un CSV con todas las secciones del report (KPIs, series,
 * top lists, tablas de detalle) separadas por líneas en blanco.
 *
 * Auth: requiere sesión admin.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raw = {
    preset: searchParams.get("preset") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    groupBy: searchParams.get("groupBy") ?? undefined,
  };

  const parsed = exportQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let range;
  try {
    range = resolveDateRange(parsed.data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Rango inválido" },
      { status: 400 },
    );
  }

  const csv = await buildReportCsv(range, parsed.data.preset);

  const filename = `radiant-reports-${parsed.data.preset}-${formatDateForFilename(range.from)}-${formatDateForFilename(range.to)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function formatDateForFilename(d: Date): string {
  return d.toISOString().slice(0, 10);
}
