import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/service-form";
import { getServiceById } from "@/server/catalog/queries";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [service, t] = await Promise.all([
    getServiceById(id),
    getTranslations({ locale, namespace: "admin.catalog" }),
  ]);
  if (!service) notFound();

  const name = (service.name as Record<string, string>) ?? {};
  const description = (service.description as Record<string, string>) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("services.editTitle")}
        description={t("services.editDescription")}
      />
      <ServiceForm
        locale={locale}
        initialData={{
          id: service.id,
          nameEs: name.es ?? "",
          nameEn: name.en ?? "",
          descriptionEs: description.es ?? "",
          descriptionEn: description.en ?? "",
          durationMin: service.durationMin,
          basePrice: Number(service.basePrice),
          image: service.image,
          category: service.category ?? "",
          order: service.order,
          isActive: service.isActive,
          extras: service.extras.map((e) => {
            const en = (e.name as Record<string, string>) ?? {};
            return {
              nameEs: en.es ?? "",
              nameEn: en.en ?? "",
              price: Number(e.price),
            };
          }),
        }}
      />
    </div>
  );
}
