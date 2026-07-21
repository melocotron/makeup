import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/server/auth";
import {
  exportQuerySchema,
  resolveDateRange,
} from "@/server/reports/validators";

export const runtime = "nodejs";

/**
 * GET /api/admin/reports/export.pdf
 *
 * Devuelve un PDF con el resumen ejecutivo: KPIs, métricas de citas y
 * clientes, y top 5 servicios. Pensado para imprimir o archivar; el
 * detalle por fila está disponible en el CSV.
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

  // Import dinámico para que @react-pdf/renderer no se incluya en el
  // bundle del cliente (es server-side only y pesado).
  const { buildReportPdf } = await import("@/server/reports/pdf");
  const buffer = await buildReportPdf(range, parsed.data.preset);

  const filename = `radiant-reports-${parsed.data.preset}-${range.from.toISOString().slice(0, 10)}-${range.to.toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "Content-Length": String(buffer.length),
    },
  });
}
