import { setRequestLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { ProfileForm } from "@/components/admin/profile-form";
import { getAboutContent } from "@/server/content/profile.queries";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const about = await getAboutContent();
  const t = await getTranslations({ locale, namespace: "admin.profile" });

  const bioObj = (about.bio as Record<string, string> | null) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <ProfileForm
        initialData={{
          bioEs: bioObj?.es ?? "",
          bioEn: bioObj?.en ?? "",
          signatureText: about.signatureText ?? "",
          image: about.image,
        }}
      />
    </div>
  );
}
