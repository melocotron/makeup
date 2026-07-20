"use client";

import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LoyaltyTransactionItem } from "@/server/loyalty/queries";

const TYPE_BADGE: Record<LoyaltyTransactionItem["type"], string> = {
  EARNED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REDEEMED:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  EXPIRED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  ADJUSTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

export function LoyaltyTransactionsList({
  transactions,
  locale,
}: {
  transactions: LoyaltyTransactionItem[];
  locale: string;
}) {
  const t = useTranslations("admin.loyalty");

  if (transactions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-on-surface-variant">
        {t("transactions.empty")}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("transactions.columns.date")}</TableHead>
            <TableHead>{t("transactions.columns.type")}</TableHead>
            <TableHead className="text-right">
              {t("transactions.columns.points")}
            </TableHead>
            <TableHead>{t("transactions.columns.reason")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="text-xs text-on-surface-variant">
                {new Date(tx.createdAt).toLocaleString(locale)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[tx.type]}`}
                >
                  {t(`transactions.type.${tx.type}`)}
                </span>
              </TableCell>
              <TableCell
                className={`text-right font-mono font-semibold tabular-nums ${
                  tx.points > 0
                    ? "text-green-700 dark:text-green-400"
                    : "text-orange-700 dark:text-orange-400"
                }`}
              >
                {tx.points > 0 ? "+" : ""}
                {tx.points}
              </TableCell>
              <TableCell className="text-sm text-on-surface-variant">
                {tx.reason ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
