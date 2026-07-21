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

export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type PostRow = {
  id: string;
  slug: string;
  title: { es: string; en: string };
  status: PostStatus;
  publishedAt: string | null;
  category: { id: string; slug: string; name: { es: string; en: string } } | null;
  updatedAt: string;
};

const STATUS_BADGE: Record<PostStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PUBLISHED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  ARCHIVED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function PostsList({ posts }: { posts: PostRow[] }) {
  const t = useTranslations("admin.blog");
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
      router.replace(`/${locale}/admin/blog?${params.toString()}`);
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
            placeholder={t("table.search")}
            className="pl-10"
          />
        </div>
        <Button asChild>
          <Link href={`/${locale}/admin/blog/nuevo`}>{t("newPost")}</Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <p className="text-sm font-semibold text-on-surface">
            {t("empty.noPosts")}
          </p>
          <p className="mt-1 max-w-sm text-xs text-on-surface-variant">
            {t("empty.noPostsDesc")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.title")}</TableHead>
                <TableHead>{t("table.category")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.publishedAt")}</TableHead>
                <TableHead>{t("table.updatedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link
                      href={`/${locale}/admin/blog/${p.id}`}
                      className="block"
                    >
                      {p.title[locale] || p.title.es}
                    </Link>
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {p.category
                      ? p.category.name[locale] || p.category.name.es
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}
                    >
                      {t(`status.${p.status}`)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-on-surface-variant">
                    {p.publishedAt
                      ? new Date(p.publishedAt).toLocaleDateString(locale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-on-surface-variant">
                    {new Date(p.updatedAt).toLocaleDateString(locale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-on-surface-variant">
        {tCommon("total")}: {posts.length}
      </p>
    </div>
  );
}
