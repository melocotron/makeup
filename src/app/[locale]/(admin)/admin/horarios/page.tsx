import { setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { ScheduleManager, type ScheduleRow } from "@/components/admin/schedule-manager";
import { listSchedules } from "@/server/booking/queries";

export default async function HorariosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const schedules = await listSchedules();
  const rows: ScheduleRow[] = schedules.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    isActive: s.isActive,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios"
        description="Define los días y horarios en los que atiendes. Los clientes solo podrán reservar dentro de estos rangos."
      />
      <ScheduleManager locale={locale} initialSchedules={rows} />
    </div>
  );
}