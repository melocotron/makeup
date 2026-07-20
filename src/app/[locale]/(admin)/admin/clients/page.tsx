import { setRequestLocale, getTranslations } from "next-intl/server";

import { ClientList } from "@/components/admin/client-list";
import { PageHeader } from "@/components/admin/page-header";
import { listClients } from "@/server/clients/queries";

export default async function ClientsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const [t, { items, total }] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    listClients({ search: sp.q, take: 50 }),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader
        title={t("nav.clients")}
        description={t("clients.description", { count: total })}
      />
      <ClientList clients={items} />
    </div>
  );
}
