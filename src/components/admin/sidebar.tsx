"use client";

import {
  BarChart3,
  Calendar,
  CalendarDays,
  FileText,
  Gift,
  Home,
  ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Percent,
  Scissors,
  Settings,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "main" | "marketing" | "content" | "system";
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard, group: "main" },
  { href: "/admin/appointments", labelKey: "appointments", icon: CalendarDays, group: "main" },
  { href: "/admin/services", labelKey: "services", icon: Scissors, group: "main" },
  { href: "/admin/packages", labelKey: "packages", icon: Package, group: "main" },
  { href: "/admin/clients", labelKey: "clients", icon: Users, group: "main" },
  { href: "/admin/promotions", labelKey: "promotions", icon: Percent, group: "marketing" },
  { href: "/admin/loyalty", labelKey: "loyalty", icon: Gift, group: "marketing" },
  { href: "/admin/content/home", labelKey: "home", icon: Home, group: "content" },
  { href: "/admin/media", labelKey: "media", icon: ImageIcon, group: "content" },
  { href: "/admin/blog", labelKey: "blog", icon: FileText, group: "content" },
  { href: "/admin/reports", labelKey: "reports", icon: BarChart3, group: "system" },
  { href: "/admin/settings", labelKey: "settings", icon: Settings, group: "system" },
];

interface SidebarContentProps {
  locale: string;
  onNavigate?: () => void;
}

export function SidebarContent({ locale, onNavigate }: SidebarContentProps) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  const isActive = (href: string) => {
    const fullHref = `/${locale}${href}`;
    if (href === "/admin") return pathname === fullHref;
    return pathname.startsWith(fullHref);
  };

  const groups: Array<{ key: "main" | "marketing" | "content" | "system"; title: string }> = [
    { key: "main", title: t("navGroup.main") },
    { key: "marketing", title: t("navGroup.marketing") },
    { key: "content", title: t("navGroup.content") },
    { key: "system", title: t("navGroup.system") },
  ];

  return (
    <div className="flex h-full flex-col bg-inverse-surface text-surface-container-lowest">
      {/* Header */}
      <div className="p-6">
        <Link href={`/${locale}`} className="block">
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-xs uppercase tracking-wider text-surface-variant">
            {t("subtitle")}
          </p>
        </Link>
      </div>

      {/* CTA */}
      <div className="px-4">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 px-4 text-xs font-semibold uppercase tracking-wider text-on-primary transition-opacity hover:opacity-90"
        >
          <Calendar className="h-4 w-4" />
          {t("newAppointment")}
        </button>
      </div>

      {/* Nav */}
      <nav className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group.key);
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="mb-4">
              <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-surface-variant/70">
                {group.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={`/${locale}${item.href}`}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center rounded-r-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                          active
                            ? "border-l-4 border-primary bg-on-secondary-fixed-variant/20 text-primary-fixed"
                            : "border-l-4 border-transparent text-surface-variant hover:bg-primary/10 hover:text-primary-fixed",
                        )}
                      >
                        <Icon className="mr-3 h-4 w-4" />
                        {t(`nav.${item.labelKey}`)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-surface-variant/20 p-3">
        <Link
          href={`/${locale}`}
          className="flex items-center rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-surface-variant hover:bg-primary/10 hover:text-primary-fixed"
        >
          <LifeBuoy className="mr-3 h-4 w-4" />
          {t("help")}
        </Link>
      </div>
    </div>
  );
}

interface SidebarProps {
  locale: string;
}

export function Sidebar({ locale }: SidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <SidebarContent locale={locale} />
    </aside>
  );
}