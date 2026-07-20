import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { CouponForm } from "@/components/admin/coupon-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { listServices } from "@/server/catalog/queries";
import { getCouponById } from "@/server/promotions/queries";
import type { Locale } from "@/i18n/routing";

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [t, services, coupon] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    listServices(),
    getCouponById(id),
  ]);

  if (!coupon) notFound();

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
        title={coupon.code}
        description={coupon.description[locale as Locale] ?? coupon.description.es}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("promotions.form.basicInfo")}</CardTitle>
          <CardDescription>
            {t("promotions.editDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CouponForm
            mode="edit"
            initialData={{
              id: coupon.id,
              code: coupon.code,
              description: coupon.description,
              type: coupon.type,
              value: coupon.value,
              minPurchase: coupon.minPurchase,
              maxUses: coupon.maxUses,
              validFrom: coupon.validFrom,
              validUntil: coupon.validUntil,
              isActive: coupon.isActive,
              usedCount: coupon.usedCount,
              serviceIds: coupon.serviceIds,
            }}
            availableServices={availableServices}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("promotions.usages.title")}</CardTitle>
          <CardDescription>
            {t("promotions.usages.description", { count: coupon.usedCount })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coupon.usages.length === 0 ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              {t("promotions.usages.empty")}
            </p>
          ) : (
            <div className="space-y-2">
              {coupon.usages.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded border border-outline-variant bg-surface-container-lowest p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {t("promotions.usages.invoice")} #{u.invoiceId.slice(-8)}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(u.usedAt).toLocaleString(locale)}
                    </p>
                  </div>
                  <p className="font-mono font-semibold tabular-nums">
                    −${u.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
