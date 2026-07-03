import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/theme/language-switcher";
import { routing, type Locale } from "@/i18n/routing";

function isValidLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  return {
    title: t("appName"),
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("nav");

  return (
    <NextIntlClientProvider messages={messages}>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-outline-variant bg-surface/90 backdrop-blur-sm">
        <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 md:px-16">
          <a href={`/${locale}`} className="font-serif-headline text-lg uppercase tracking-wide text-on-surface">
            {t("home")}
          </a>
          <div className="flex items-center gap-4 md:gap-8">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main className="pt-20">{children}</main>
    </NextIntlClientProvider>
  );
}