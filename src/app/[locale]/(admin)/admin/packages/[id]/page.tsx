import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { PackageForm } from "@/components/admin/package-form";
import { getPackageById, listAllServices } from "@/server/catalog/queries";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [pkg, services] = await Promise.all([getPackageById(id), listAllServices()]);
  if (!pkg) notFound();

  return <EditPackageContent locale={locale} pkg={pkg!} services={services} />;
}

function EditPackageContent({
  locale,
  pkg,
  services,
}: {
  locale: string;
  pkg: NonNullable<Awaited<ReturnType<typeof getPackageById>>>;
  services: Awaited<ReturnType<typeof listAllServices>>;
}) {
  const t = useTranslations("admin.catalog");
  const name = (pkg.name as Record<string, string>) ?? {};
  const description = (pkg.description as Record<string, string>) ?? {};

  const availableServices = services.map((s) => ({
    id: s.id,
    name: (s.name as Record<string, string>) ?? {},
    durationMin: s.durationMin,
    basePrice: Number(s.basePrice),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("packages.editTitle")}
        description={t("packages.editDescription")}
      />
      <PackageForm
        locale={locale}
        availableServices={availableServices}
        initialData={{
          id: pkg.id,
          nameEs: name.es ?? "",
          nameEn: name.en ?? "",
          descriptionEs: description.es ?? "",
          descriptionEn: description.en ?? "",
          totalPrice: Number(pkg.totalPrice),
          image: pkg.image,
          order: pkg.order,
          isActive: pkg.isActive,
          items: pkg.items.map((it) => ({
            serviceId: it.serviceId,
            quantity: it.quantity,
          })),
        }}
      />
    </div>
  );
}