import { setRequestLocale, getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoyaltyRuleForm } from "@/components/admin/loyalty-rule-form";
import { PageHeader } from "@/components/admin/page-header";
import { getActiveLoyaltyRule, listLoyaltyRules } from "@/server/loyalty/queries";

export default async function LoyaltyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const [activeRule, history] = await Promise.all([
    getActiveLoyaltyRule(),
    listLoyaltyRules(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={t("nav.loyalty")}
        description={t("loyalty.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("loyalty.activeRule")}</CardTitle>
          <CardDescription>
            {activeRule
              ? t("loyalty.activeRuleDesc", { name: activeRule.name })
              : t("loyalty.noActiveRule")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeRule && (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                <p className="text-xs text-on-surface-variant">
                  {t("loyalty.stats.earn")}
                </p>
                <p className="text-lg font-semibold">
                  1 / ${activeRule.pointsPerAmount.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                <p className="text-xs text-on-surface-variant">
                  {t("loyalty.stats.redeem")}
                </p>
                <p className="text-lg font-semibold">
                  {activeRule.pointsToRedeem} pts
                </p>
              </div>
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                <p className="text-xs text-on-surface-variant">
                  {t("loyalty.stats.value")}
                </p>
                <p className="text-lg font-semibold">
                  ${activeRule.redeemValue.toFixed(2)}
                </p>
              </div>
            </div>
          )}
          <LoyaltyRuleForm
            initialData={
              activeRule
                ? {
                    id: activeRule.id,
                    name: activeRule.name,
                    pointsPerAmount: activeRule.pointsPerAmount,
                    pointsToRedeem: activeRule.pointsToRedeem,
                    redeemValue: activeRule.redeemValue,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>

      {history.items.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("loyalty.history")}</CardTitle>
            <CardDescription>
              {t("loyalty.historyDesc", {
                count: history.items.length - 1,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {history.items.slice(1).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded border border-outline-variant bg-surface-container-low p-2"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-on-surface-variant">
                    {new Date(r.updatedAt).toLocaleDateString(locale)} ·{" "}
                    {r.isActive ? t("loyalty.active") : t("loyalty.inactive")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
