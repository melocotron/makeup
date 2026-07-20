"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Locale } from "@/i18n/routing";

export type CouponStatus = "active" | "expired" | "exhausted" | "inactive";

export type CouponRow = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minPurchase: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  serviceIds: string[] | null;
  status: CouponStatus;
};

const STATUS_BADGE: Record<CouponStatus, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  expired: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  exhausted:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  inactive: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function CouponsList({ coupons }: { coupons: CouponRow[] }) {
  const t = useTranslations("admin.promotions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale() as Locale;
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      router.replace(`/${locale}/admin/promotions?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="pl-10"
          />
        </div>
        <Button asChild>
          <Link href={`/${locale}/admin/promotions/nuevo`}>{t("newCoupon")}</Link>
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <p className="text-sm font-semibold text-on-surface">{t("empty.noCoupons")}</p>
          <p className="mt-1 max-w-sm text-xs text-on-surface-variant">
            {t("empty.noCouponsDesc")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.code")}</TableHead>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.value")}</TableHead>
                <TableHead>{t("columns.validity")}</TableHead>
                <TableHead className="text-right">{t("columns.uses")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`/${locale}/admin/promotions/${c.id}`}
                      className="block"
                    >
                      {c.code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {t(`type.${c.type}`)}
                  </TableCell>
                  <TableCell>
                    {c.type === "PERCENTAGE"
                      ? `${c.value}%`
                      : new Intl.NumberFormat(locale, {
                          style: "currency",
                          currency: "USD",
                        }).format(c.value)}
                  </TableCell>
                  <TableCell className="text-xs text-on-surface-variant">
                    {new Date(c.validFrom).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {" – "}
                    {new Date(c.validUntil).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.usedCount}
                    {c.maxUses !== null ? ` / ${c.maxUses}` : ""}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}
                    >
                      {t(`status.${c.status}`)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-on-surface-variant">
        {tCommon("total")}: {coupons.length}
      </p>
    </div>
  );
}
