import { setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { AppointmentsList, type AppointmentListItem } from "@/components/admin/appointments-list";
import { listAppointments } from "@/server/booking/queries";

export default async function CitasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const appointments = await listAppointments();

  const items: AppointmentListItem[] = appointments.map((a) => ({
    id: a.id,
    scheduledAt: a.scheduledAt.toISOString(),
    durationMin: a.durationMin,
    status: a.status as AppointmentListItem["status"],
    notes: a.notes,
    client: {
      id: a.client.id,
      name: a.client.name,
      email: a.client.email,
      phone: a.client.phone,
    },
    service: {
      id: a.service.id,
      name: a.service.name as Record<string, string>,
      durationMin: a.service.durationMin,
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citas"
        description="Gestiona las reservas de clientes. Confirma, cancela o marca como completada cada cita."
      />
      <AppointmentsList locale={locale} initialData={items} />
    </div>
  );
}