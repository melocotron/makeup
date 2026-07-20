import { setRequestLocale, getTranslations } from "next-intl/server";

import { CouponForm } from "@/components/admin/coupon-form";
import { PageHeader } from "@/components/admin/page-header";
import { listServices } from "@/server/catalog/queries";
import type { Locale } from "@/i18n/routing";

export default async function NewCouponPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, services] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    listServices(),
  ]);

  const availableServices = services.map((s) => {
    const name =
      (s.name as Record<string, string> | null)?.[locale as Locale] ??
      (s.name as Record<string, string> | null)?.es ??
      s.id;
    return { id: s.id, name };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={t("promotions.newCoupon")}
        description={t("promotions.newCouponDesc")}
      />
      <CouponForm mode="create" availableServices={availableServices} />
    </div>
  );
}
