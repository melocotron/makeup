import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "@/components/theme/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { type Locale } from "@/i18n/routing";
import { PublicNav } from "./public-nav";

export function PublicHeader({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-outline-variant bg-surface/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 md:px-16">
        <a
          href={`/${locale}`}
          className="font-serif-headline text-lg uppercase tracking-wide text-on-surface"
        >
          Radiant Beauty
        </a>

        {/* Menú desktop */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href={`/${locale}#services`}
            className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
          >
            {t("services")}
          </a>
          <a
            href={`/${locale}#packages`}
            className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
          >
            {t("packages")}
          </a>
          <a
            href={`/${locale}#about`}
            className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
          >
            {t("about")}
          </a>
          <a
            href={`/${locale}#booking`}
            className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
          >
            {t("booking")}
          </a>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <a
            href={`/${locale}/admin/login`}
            className="hidden text-xs font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary md:inline"
          >
            {t("login")}
          </a>
          <a
            href={`/${locale}#booking`}
            className="hidden bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 md:inline-block md:px-6"
          >
            {t("bookNow")}
          </a>
          <PublicNav locale={locale} />
        </div>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-outline-variant bg-surface-container-lowest py-12">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-16">
        <p className="text-xs uppercase tracking-widest text-on-surface-variant">
          © {year} Radiant Beauty · {t("rights")}
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          <a
            href="#"
            className="text-xs uppercase tracking-wider text-on-surface-variant transition-colors hover:text-primary"
          >
            {t("privacy")}
          </a>
          <a
            href="#"
            className="text-xs uppercase tracking-wider text-on-surface-variant transition-colors hover:text-primary"
          >
            {t("terms")}
          </a>
          <a
            href="#"
            className="text-xs uppercase tracking-wider text-on-surface-variant transition-colors hover:text-primary"
          >
            {t("cookies")}
          </a>
        </div>
      </div>
    </footer>
  );
}