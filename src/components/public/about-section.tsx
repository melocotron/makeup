import Image from "next/image";
import { useTranslations } from "next-intl";

export interface PublicAboutData {
  bio: unknown;
  image: string | null;
  signatureText: string | null;
}

function pickLocalized(field: unknown, locale: string): string {
  if (field && typeof field === "object") {
    const f = field as Record<string, unknown>;
    const v = f[locale] ?? f.es ?? f.en;
    return typeof v === "string" ? v : "";
  }
  return "";
}

export function AboutSection({
  about,
  locale,
}: {
  about: PublicAboutData;
  locale: string;
}) {
  const t = useTranslations("public.about");
  const bio = pickLocalized(about.bio, locale);
  const hasContent = !!bio || !!about.image;

  if (!hasContent) {
    return (
      <section id="about" className="px-4 py-20 md:px-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif-display mb-4 text-4xl text-on-surface md:text-5xl">
            {t("title")}
          </h2>
          <p className="text-on-surface-variant">{t("emptyBio")}</p>
        </div>
      </section>
    );
  }

  return (
    <section id="about" className="px-4 py-20 md:px-16 md:py-24">
      <div className="mx-auto grid max-w-[1200px] gap-12 md:grid-cols-2 md:items-center">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-container">
          {about.image ? (
            <Image
              src={about.image}
              alt={t("title")}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <span className="font-display text-6xl">R</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="font-serif-display text-4xl text-on-surface md:text-5xl">
            {t("title")}
          </h2>
          {bio && (
            <p className="leading-relaxed text-on-surface-variant">{bio}</p>
          )}
          {about.signatureText && (
            <p className="font-serif-headline text-lg italic text-primary">
              — {about.signatureText}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
