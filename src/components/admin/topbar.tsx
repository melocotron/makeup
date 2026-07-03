"use client";

import { ChevronRight, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LanguageSwitcher } from "@/components/theme/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { UserMenu } from "./user-menu";

interface TopbarProps {
  user: { name: string; email: string };
  onMenuToggle: () => void;
}

export function Topbar({ user, onMenuToggle }: TopbarProps) {
  const t = useTranslations("admin");
  const tNav = useTranslations("nav");
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  // segments: [locale, 'admin', 'appointments', ...]
  const breadcrumbs = segments.slice(1).map((segment, idx) => {
    const href = "/" + segments.slice(0, idx + 2).join("/");
    return { href, label: segment };
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 lg:px-6">
      <div className="flex items-center gap-2 lg:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
          <Link href={`/${segments[0]}`} className="text-on-surface-variant hover:text-primary">
            {tNav("home")}
          </Link>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <span key={crumb.href} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-on-surface-variant" />
                <Link
                  href={crumb.href}
                  className={cn(
                    "uppercase tracking-wider text-xs font-semibold",
                    isLast ? "text-on-surface" : "text-on-surface-variant hover:text-primary",
                  )}
                >
                  {crumb.label}
                </Link>
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <span className="hidden text-xs text-on-surface-variant md:inline">{t("loggedInAs")}</span>
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}