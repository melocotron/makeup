import { setRequestLocale, getTranslations } from "next-intl/server";

import { CouponsList } from "@/components/admin/coupons-list";
import { PageHeader } from "@/components/admin/page-header";
import { listCoupons, getCouponStats } from "@/server/promotions/queries";

export default async function PromotionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const statusParam = (sp.status ?? "all") as
    | "all"
    | "active"
    | "expired"
    | "exhausted"
    | "inactive";

  const [coupons, stats] = await Promise.all([
    listCoupons({ search: sp.q, status: statusParam }),
    getCouponStats(),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader
        title={t("nav.promotions")}
        description={t("promotions.description", {
          active: stats.totalActive,
          exhausted: stats.totalExhausted,
          monthUsages: stats.totalUsagesThisMonth,
        })}
      />
      <CouponsList coupons={coupons.items} />
    </div>
  );
}
