"use client";

import { Pencil, Package as PackageIcon, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";

import { deletePackageAction, togglePackageActiveAction } from "@/server/catalog/packages";

export interface PackageListItem {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  totalPrice: number;
  image: string | null;
  isActive: boolean;
  order: number;
  _count: { items: number };
}

interface PackageListProps {
  initialData: PackageListItem[];
  locale: string;
}

export function PackageList({ initialData, locale }: PackageListProps) {
  const t = useTranslations("admin.catalog.packages");
  const [items, setItems] = useState(initialData);

  async function handleToggle(id: string, isActive: boolean) {
    const result = await togglePackageActiveAction(id, isActive);
    if (result.success) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isActive } : i)));
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    const result = await deletePackageAction(id);
    if (result.success) {
      toast.success(t("deleted"));
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
        <PackageIcon className="h-12 w-12 text-outline" />
        <p className="mt-4 text-sm font-semibold text-on-surface">{t("emptyTitle")}</p>
        <p className="mt-1 max-w-sm text-xs text-on-surface-variant">{t("emptyDesc")}</p>
        <Button asChild className="mt-4">
          <Link href={`/${locale}/admin/packages/nuevo`}>
            <Plus className="h-4 w-4" />
            {t("newPackage")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/${locale}/admin/packages/nuevo`}>
            <Plus className="h-4 w-4" />
            {t("newPackage")}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((pkg) => (
          <div
            key={pkg.id}
            className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest"
          >
            <div className="relative aspect-video w-full bg-surface-container">
              {pkg.image ? (
                <Image
                  src={pkg.image}
                  alt={pkg.name.es ?? ""}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-on-surface-variant">
                  <PackageIcon className="h-12 w-12" />
                </div>
              )}
              <div className="absolute right-2 top-2">
                <Badge variant={pkg.isActive ? "success" : "default"}>
                  {pkg.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="font-headline-md text-headline-md text-on-surface">
                  {pkg.name.es ?? "—"}
                </p>
                {pkg.description.es && (
                  <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                    {pkg.description.es}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant pt-3">
                <div>
                  <p className="font-display text-headline-md text-on-surface">
                    ${pkg.totalPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {pkg._count.items} {pkg._count.items === 1 ? "servicio" : "servicios"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={pkg.isActive}
                    onCheckedChange={(v) => handleToggle(pkg.id, v)}
                  />
                  <Button asChild size="icon" variant="ghost" aria-label={t("edit")}>
                    <Link href={`/${locale}/admin/packages/${pkg.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(pkg.id)}
                    aria-label={t("delete")}
                    className="text-error hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}