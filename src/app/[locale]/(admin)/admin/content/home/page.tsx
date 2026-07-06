import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { CarouselList, type CarouselSlide } from "@/components/admin/carousel-list";
import { PageHeader } from "@/components/admin/page-header";
import { listCarouselSlides } from "@/server/content/carousel.queries";

export default async function HomeCarouselPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const items = await listCarouselSlides();
  const serialized: CarouselSlide[] = items.map((s) => ({
    id: s.id,
    image: s.image,
    title: (s.title as Record<string, string>) ?? {},
    subtitle: (s.subtitle as Record<string, string> | null) ?? null,
    ctaLabel: (s.ctaLabel as Record<string, string> | null) ?? null,
    ctaUrl: s.ctaUrl,
    order: s.order,
    isActive: s.isActive,
  }));

  return <CarouselContent items={serialized} />;
}

function CarouselContent({ items }: { items: CarouselSlide[] }) {
  const t = useTranslations("admin.carousel");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <CarouselList initialData={items} />
    </div>
  );
}