import { Construction } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export default async function LoyaltyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader title={t("nav.loyalty")} description={t("comingSoon.description")} />
      <EmptyState
        icon={Construction}
        title={t("comingSoon.title")}
        description={t("comingSoon.phaseLabel", {
          phase: t("comingSoon.phase.loyalty"),
          name: t("nav.loyalty"),
        })}
      />
    </div>
  );
}
