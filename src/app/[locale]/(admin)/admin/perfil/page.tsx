import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

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

  // Extract bio strings from JSON
  const bioObj = (about.bio as Record<string, string> | null) ?? null;

  return (
    <ProfileContent
      bioEs={bioObj?.es ?? ""}
      bioEn={bioObj?.en ?? ""}
      signatureText={about.signatureText ?? ""}
      image={about.image}
    />
  );
}

function ProfileContent({
  bioEs,
  bioEn,
  signatureText,
  image,
}: {
  bioEs: string;
  bioEn: string;
  signatureText: string;
  image: string | null;
}) {
  const t = useTranslations("admin.profile");
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <ProfileForm
        initialData={{
          bioEs,
          bioEn,
          signatureText,
          image,
        }}
      />
    </div>
  );
}