import { setRequestLocale, getTranslations } from "next-intl/server";

import { MediaBrowser } from "@/components/admin/media-browser";
import { PageHeader } from "@/components/admin/page-header";

export default async function MediaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin.media" });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <MediaBrowser />
    </div>
  );
}
