"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteCategory, upsertCategory } from "@/server/blog/actions";

export interface CategoryRow {
  id: string;
  slug: string;
  name: { es: string; en: string };
  order: number;
}

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const t = useTranslations("admin.blog");
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const slug = String(formData.get("slug") ?? "").trim();
    const nameEs = String(formData.get("nameEs") ?? "").trim();
    const nameEn = String(formData.get("nameEn") ?? "").trim();
    const order = Number(formData.get("order") ?? 0);

    if (!slug || !nameEs || !nameEn) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    startTransition(async () => {
      const result = await upsertCategory({
        ...(editing ? { id: editing.id } : {}),
        slug,
        name: { es: nameEs, en: nameEn },
        order,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? t("category.updated") : t("category.created"));
      setEditing(null);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    if (!confirm(t("category.confirmDelete"))) return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("category.deleted"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">
          {editing ? t("category.editTitle") : t("category.createTitle")}
        </h3>
        <form action={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="slug">{t("category.slug")}</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="tutoriales"
                defaultValue={editing?.slug ?? ""}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order">{t("category.order")}</Label>
              <Input
                id="order"
                name="order"
                type="number"
                min="0"
                defaultValue={editing?.order ?? 0}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nameEs">{t("category.nameEs")}</Label>
              <Input
                id="nameEs"
                name="nameEs"
                placeholder="Tutoriales"
                defaultValue={editing?.name.es ?? ""}
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameEn">{t("category.nameEn")}</Label>
              <Input
                id="nameEn"
                name="nameEn"
                placeholder="Tutorials"
                defaultValue={editing?.name.en ?? ""}
                disabled={isPending}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(null)}
                disabled={isPending}
              >
                {t("cancelEdit")}
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {editing ? t("save") : t("create")}
            </Button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest">
        {categories.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-on-surface-variant">
            {t("empty.noCategories")}
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-on-surface">
                    {c.name.es} / {c.name.en}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {c.slug} · {t("category.orderLabel", { order: c.order })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(c)}
                    disabled={isPending}
                    aria-label={t("edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(c.id)}
                    disabled={isPending}
                    className="text-error hover:text-error"
                    aria-label={t("delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
