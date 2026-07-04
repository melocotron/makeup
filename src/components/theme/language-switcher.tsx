"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    const segments = pathname.split("/");
    if (segments[1] === locale) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    const newPath = segments.join("/") || "/";
    router.push(newPath);
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        onClick={() => switchLocale("es")}
        className={cn(
          "cursor-pointer px-2 py-1 text-xs font-semibold uppercase tracking-wider rounded transition-colors",
          locale === "es"
            ? "bg-primary text-on-primary"
            : "text-on-surface-variant hover:text-primary",
        )}
        aria-label="Español"
      >
        ES
      </button>
      <span className="text-outline text-xs">/</span>
      <button
        onClick={() => switchLocale("en")}
        className={cn(
          "cursor-pointer px-2 py-1 text-xs font-semibold uppercase tracking-wider rounded transition-colors",
          locale === "en"
            ? "bg-primary text-on-primary"
            : "text-on-surface-variant hover:text-primary",
        )}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}

export function LanguageSwitcherIcon({ className }: { className?: string }) {
  return <Languages className={cn("h-4 w-4", className)} />;
}