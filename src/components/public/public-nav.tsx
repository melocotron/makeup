"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/theme/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { type Locale } from "@/i18n/routing";

export function PublicNav({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");
  const tPublic = useTranslations("public.common");
  const [open, setOpen] = useState(false);

  const links = [
    { href: `/${locale}#services`, label: t("services") },
    { href: `/${locale}#packages`, label: t("packages") },
    { href: `/${locale}#about`, label: t("about") },
    { href: `/${locale}#booking`, label: t("booking") },
  ];

  return (
    <>
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label={tPublic("menu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            className="fixed inset-y-0 right-0 z-50 w-72 bg-surface-container-lowest p-6 shadow-[var(--shadow-level-2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif-headline text-lg uppercase tracking-wide text-on-surface">
                {tPublic("menu")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label={tPublic("close")}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex flex-col gap-1">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                >
                  {link.label}
                </a>
              ))}

              <div className="my-4 border-t border-outline-variant" />

              <div className="flex items-center gap-2 px-3">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>

              <a
                href={`/${locale}/admin/login`}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-semibold uppercase tracking-widest text-on-surface-variant hover:text-primary"
              >
                {t("login")}
              </a>
              <a
                href={`/${locale}#booking`}
                onClick={() => setOpen(false)}
                className="mt-2 bg-primary px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-on-primary"
              >
                {t("bookNow")}
              </a>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
