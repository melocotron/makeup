import { setRequestLocale } from "next-intl/server";

import { PublicFooter, PublicHeader } from "@/components/public/public-chrome";
import { routing, type Locale } from "@/i18n/routing";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    return null;
  }

  setRequestLocale(locale as Locale);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader locale={locale as Locale} />
      <main className="flex-1 pt-20">{children}</main>
      <PublicFooter />
    </div>
  );
}