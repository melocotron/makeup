import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { MediaBrowser } from "@/components/admin/media-browser";
import { PageHeader } from "@/components/admin/page-header";

export default async function MediaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MediaContent />;
}

function MediaContent() {
  const t = useTranslations("admin.media");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <MediaBrowser />
    </div>
  );
}