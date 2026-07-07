import { setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import {
  ScheduleExceptionsManager,
  type ExceptionRow,
} from "@/components/admin/schedule-exceptions-manager";
import { listScheduleExceptions } from "@/server/booking/queries";

export default async function BloqueosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const exceptions = await listScheduleExceptions();
  const rows: ExceptionRow[] = exceptions.map((e) => {
    const d = new Date(e.date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return {
      date: `${y}-${m}-${day}`,
      reason: e.reason,
      isBlocked: e.isBlocked,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bloqueos de calendario"
        description="Bloquea fechas específicas (vacaciones, feriados) o marca horarios especiales."
      />
      <ScheduleExceptionsManager locale={locale} initialExceptions={rows} />
    </div>
  );
}