import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { AdjustPointsDialog } from "@/components/admin/adjust-points-dialog";
import { ClientDeleteButton } from "@/components/admin/client-delete-button";
import { ClientForm } from "@/components/admin/client-form";
import { ClientHistory } from "@/components/admin/client-history";
import { LoyaltyTransactionsList } from "@/components/admin/loyalty-transactions-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { getClientById } from "@/server/clients/queries";
import { getClientLoyalty } from "@/server/loyalty/queries";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [t, client, loyalty] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getClientById(id),
    getClientLoyalty(id, 20),
  ]);

  if (!client) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title={client.name}
        description={`${client.email} · ${client.phone ?? "—"}`}
        actions={<ClientDeleteButton id={client.id} hasAppointments={client.appointments.length > 0} />}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("clients.stats.appointments")}</CardDescription>
            <CardTitle className="text-3xl">{client.stats.totalAppointments}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant">
            {t("clients.stats.completed", { count: client.stats.completed })} · {t("clients.stats.cancelled", { count: client.stats.cancelled })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("clients.stats.spent")}</CardDescription>
            <CardTitle className="text-3xl">${client.stats.totalSpent.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("clients.stats.loyalty")}</CardDescription>
            <CardTitle className="text-3xl">{client.loyaltyPoints}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-on-surface-variant">
            {t("clients.stats.memberSince", {
              date: new Date(client.registeredAt).toLocaleDateString(locale),
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("clients.form.basicInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            mode="edit"
            initialData={{
              id: client.id,
              email: client.email,
              name: client.name,
              phone: client.phone ?? "",
              notes: client.notes ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("clients.loyalty.title")}</CardTitle>
            <CardDescription>
              {t("clients.loyalty.balanceDesc", {
                balance: loyalty.balance,
                earned: loyalty.totalEarned,
                redeemed: loyalty.totalRedeemed,
              })}
            </CardDescription>
          </div>
          <AdjustPointsDialog
            clientId={client.id}
            clientName={client.name}
            currentBalance={loyalty.balance}
          />
        </CardHeader>
        <CardContent>
          <LoyaltyTransactionsList
            transactions={loyalty.recent}
            locale={locale}
          />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-headline-sm font-semibold text-on-surface">
          {t("clients.history.title")}
        </h2>
        <ClientHistory items={client.appointments} />
      </div>
    </div>
  );
}
