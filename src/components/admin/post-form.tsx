"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { JSONContent } from "@tiptap/react";

import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPost, updatePost } from "@/server/blog/actions";
import { createPostSchema } from "@/server/blog/validators";
import type { Locale } from "@/i18n/routing";

export type PostFormCategory = {
  id: string;
  name: { es: string; en: string };
};

export interface PostFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    slug: string;
    title: { es: string; en: string };
    excerpt: { es: string; en: string };
    content: unknown;
    image: string | null;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    publishedAt: string | null;
    categoryId: string | null;
    tags: string[];
  };
  categories: PostFormCategory[];
  locale: Locale;
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [] };

export function PostForm({ mode, initialData, categories, locale }: PostFormProps) {
  const t = useTranslations("admin.blog");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState<JSONContent>(
    (initialData?.content as JSONContent | null) ?? EMPTY_DOC,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createPostSchema),
    defaultValues: initialData
      ? {
          slug: initialData.slug,
          title: initialData.title,
          excerpt: initialData.excerpt,
          image: initialData.image,
          status: initialData.status,
          publishedAt: initialData.publishedAt
            ? new Date(initialData.publishedAt)
            : null,
          categoryId: initialData.categoryId,
          tags: initialData.tags.join(","),
        }
      : {
          status: "DRAFT" as const,
          title: { es: "", en: "" },
          excerpt: { es: "", en: "" },
          slug: "",
        },
  });

  function onSubmit(data: Record<string, unknown>) {
    startTransition(async () => {
      const payload = {
        ...data,
        content,
        tags: typeof data.tags === "string" && data.tags.trim() ? data.tags : null,
        image:
          typeof data.image === "string" && data.image.trim()
            ? data.image
            : null,
        categoryId:
          typeof data.categoryId === "string" && data.categoryId
            ? data.categoryId
            : null,
      };

      const result =
        mode === "create"
          ? await createPost(payload as never)
          : await updatePost({
              id: initialData!.id,
              ...payload,
            } as never);

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        mode === "create" ? t("form.created") : t("form.updated"),
      );
      if (mode === "create" && result.id) {
        router.push(`/${locale}/admin/blog/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title i18n */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">
          {t("form.titleSection")}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="title-es">{t("form.titleEs")} *</Label>
            <Input
              id="title-es"
              {...register("title.es")}
              placeholder="Mi primer post"
            />
            {errors.title?.es && (
              <p className="text-xs text-error">
                {errors.title.es.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title-en">{t("form.titleEn")} *</Label>
            <Input
              id="title-en"
              {...register("title.en")}
              placeholder="My first post"
            />
            {errors.title?.en && (
              <p className="text-xs text-error">
                {errors.title.en.message as string}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Slug + Status + Category */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">
          {t("form.settingsSection")}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="slug">{t("form.slug")} *</Label>
            <Input
              id="slug"
              {...register("slug")}
              placeholder="mi-primer-post"
            />
            {errors.slug && (
              <p className="text-xs text-error">
                {errors.slug.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">{t("form.status")}</Label>
            <select
              id="status"
              {...register("status")}
              className="flex h-10 w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <option value="DRAFT">{t("status.DRAFT")}</option>
              <option value="PUBLISHED">{t("status.PUBLISHED")}</option>
              <option value="ARCHIVED">{t("status.ARCHIVED")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoryId">{t("form.category")}</Label>
            <select
              id="categoryId"
              {...register("categoryId")}
              className="flex h-10 w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <option value="">{t("form.noCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[locale as Locale] || c.name.es}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Excerpt i18n */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">
          {t("form.excerptSection")}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="excerpt-es">{t("form.excerptEs")} *</Label>
            <textarea
              id="excerpt-es"
              rows={3}
              {...register("excerpt.es")}
              className="flex w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            />
            {errors.excerpt?.es && (
              <p className="text-xs text-error">
                {errors.excerpt.es.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="excerpt-en">{t("form.excerptEn")} *</Label>
            <textarea
              id="excerpt-en"
              rows={3}
              {...register("excerpt.en")}
              className="flex w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            />
            {errors.excerpt?.en && (
              <p className="text-xs text-error">
                {errors.excerpt.en.message as string}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content (Tiptap) */}
      <div className="space-y-1.5">
        <Label>{t("form.content")} *</Label>
        <TiptapEditor value={content} onChange={setContent} />
      </div>

      {/* Image + Tags */}
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
        <h3 className="mb-4 text-sm font-semibold text-on-surface">
          {t("form.mediaSection")}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="image">{t("form.image")}</Label>
            <Input
              id="image"
              {...register("image")}
              placeholder="https://example.com/cover.jpg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">{t("form.tags")}</Label>
            <Input
              id="tags"
              {...register("tags")}
              placeholder="tutorial, nextjs, prisma"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon("loading")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create" ? t("form.create") : t("form.save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
