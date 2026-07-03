"use client";

import { Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";

import { deleteServiceAction, toggleServiceActiveAction } from "@/server/catalog/services";

export interface ServiceListItem {
  id: string;
  name: Record<string, string>;
  durationMin: number;
  basePrice: number;
  image: string | null;
  category: string | null;
  isActive: boolean;
  order: number;
  _count: { extras: number; packageItems: number };
}

interface ServiceListProps {
  initialData: ServiceListItem[];
  locale: string;
}

export function ServiceList({ initialData, locale }: ServiceListProps) {
  const t = useTranslations("admin.catalog");
  const [items, setItems] = useState(initialData);

  async function handleToggle(id: string, isActive: boolean) {
    const result = await toggleServiceActiveAction(id, isActive);
    if (result.success) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isActive } : i)));
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("services.confirmDelete"))) return;
    const result = await deleteServiceAction(id);
    if (result.success) {
      toast.success(t("services.deleted"));
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
        <Scissors className="h-12 w-12 text-outline" />
        <p className="mt-4 text-sm font-semibold text-on-surface">{t("services.emptyTitle")}</p>
        <p className="mt-1 max-w-sm text-xs text-on-surface-variant">
          {t("services.emptyDesc")}
        </p>
        <Button asChild className="mt-4">
          <Link href={`/${locale}/admin/services/nuevo`}>
            <Plus className="h-4 w-4" />
            {t("services.newService")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/${locale}/admin/services/nuevo`}>
            <Plus className="h-4 w-4" />
            {t("services.newService")}
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline-variant">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16" />
              <TableHead>{t("services.nameEs")}</TableHead>
              <TableHead>{t("services.duration")}</TableHead>
              <TableHead>{t("services.basePrice")}</TableHead>
              <TableHead>{t("services.extras")}</TableHead>
              <TableHead>{t("services.active")}</TableHead>
              <TableHead className="w-32 text-right">{t("services.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((svc) => (
              <TableRow key={svc.id}>
                <TableCell>
                  {svc.image ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded bg-surface-container">
                      <Image
                        src={svc.image}
                        alt={svc.name.es ?? ""}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-container text-on-surface-variant">
                      <Scissors className="h-4 w-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium text-on-surface">
                  <div>
                    <p>{svc.name.es ?? "—"}</p>
                    {svc.category && (
                      <Badge variant="outline" className="mt-1">
                        {svc.category}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-on-surface-variant">
                  {svc.durationMin} {t("services.minutes")}
                </TableCell>
                <TableCell className="font-display text-lg text-on-surface">
                  ${svc.basePrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-on-surface-variant">
                  {svc._count.extras > 0 ? (
                    <Badge variant="secondary">{svc._count.extras}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={svc.isActive}
                    onCheckedChange={(v) => handleToggle(svc.id, v)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild size="icon" variant="ghost" aria-label={t("services.edit")}>
                      <Link href={`/${locale}/admin/services/${svc.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(svc.id)}
                      aria-label={t("services.delete")}
                      className="text-error hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}