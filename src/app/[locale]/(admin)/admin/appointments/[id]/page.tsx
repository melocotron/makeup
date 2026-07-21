import { notFound } from "next/navigation";
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Receipt } from "lucide-react";

import { BillingSection } from "@/components/admin/billing-section";
import { Button } from "@/components/ui/button";
import { AppointmentDetailView, type AppointmentDetail } from "@/components/admin/appointment-detail";
import { getAppointmentById } from "@/server/booking/queries";

export default async function CitaDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [appointment, t] = await Promise.all([
    getAppointmentById(id),
    getTranslations({ locale, namespace: "admin.appointments" }),
  ]);
  if (!appointment) notFound();

  const detail: AppointmentDetail = {
    id: appointment.id,
    scheduledAt: appointment.scheduledAt.toISOString(),
    durationMin: appointment.durationMin,
    status: appointment.status as AppointmentDetail["status"],
    notes: appointment.notes,
    internalNotes: appointment.internalNotes,
    cancelReason: appointment.cancelReason,
    client: {
      id: appointment.client.id,
      name: appointment.client.name,
      email: appointment.client.email,
      phone: appointment.client.phone,
    },
    service: {
      id: appointment.service.id,
      name: appointment.service.name as Record<string, string>,
      durationMin: appointment.service.durationMin,
    },
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/${locale}/admin/appointments`}>
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold text-on-surface">
        {t("title")}
      </h1>
      <AppointmentDetailView appointment={detail} locale={locale} />

      {/* Sección de facturación: server-rendered para que pueda usar
          getInvoiceForAppointment y mostrar el estado actual. */}
      <BillingSection
        appointmentId={appointment.id}
        appointmentStatus={appointment.status as AppointmentDetail["status"]}
        locale={locale}
      />
    </div>
  );
}
