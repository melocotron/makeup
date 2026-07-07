import { NextResponse } from "next/server";

import { getAvailableSlots } from "@/server/booking/queries";

/**
 * GET /api/booking/slots?serviceId=X&date=YYYY-MM-DD
 *
 * Returns available slots for a given service on a given date.
 * Public endpoint (no auth) — used by the booking wizard.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const dateStr = searchParams.get("date");

  if (!serviceId || !dateStr) {
    return NextResponse.json(
      { error: "serviceId y date requeridos" },
      { status: 400 },
    );
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return NextResponse.json(
      { error: "Formato de fecha inválido (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const targetDate = new Date(y!, m! - 1, d!);

  if (isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  try {
    const slots = await getAvailableSlots(targetDate, serviceId);
    return NextResponse.json({
      slots: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        displayTime: s.displayTime,
        available: s.available,
      })),
    });
  } catch (err) {
    console.error("[api/booking/slots]", err);
    return NextResponse.json(
      { error: "Error al cargar horarios" },
      { status: 500 },
    );
  }
}