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

export type ClientRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  appointmentCount: number;
  lastVisit: string | null;
  loyaltyPoints: number;
};

export function ClientList({ clients }: { clients: ClientRow[] }) {
  const t = useTranslations("admin.clients");
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
      router.replace(`/${locale}/admin/clients?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="pl-10"
          />
        </div>
        <Button asChild>
          <Link href={`/${locale}/admin/clients/nuevo`}>{t("newClient")}</Link>
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <p className="text-sm font-semibold text-on-surface">{t("empty.noClients")}</p>
          <p className="mt-1 max-w-sm text-xs text-on-surface-variant">
            {t("empty.noClientsDesc")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.email")}</TableHead>
                <TableHead>{t("columns.phone")}</TableHead>
                <TableHead className="text-right">{t("columns.appointments")}</TableHead>
                <TableHead>{t("columns.lastVisit")}</TableHead>
                <TableHead className="text-right">{t("columns.loyalty")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">
                    <Link href={`/${locale}/admin/clients/${c.id}`} className="block">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-on-surface-variant">{c.email}</TableCell>
                  <TableCell className="text-on-surface-variant">
                    {c.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.appointmentCount}
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {c.lastVisit
                      ? new Date(c.lastVisit).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.loyaltyPoints}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-on-surface-variant">
        {tCommon("total")}: {clients.length}
      </p>
    </div>
  );
}
