"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  pageOfLabel: string;
  prevLabel: string;
  nextLabel: string;
  /**
   * Cualquier string que se quiera preservar en la URL al cambiar
   * de página (sortBy de la tabla, status, etc.). Se pasa como prop
   * porque cada tabla tiene su propio "sort key" que la identifica.
   */
  sortKey: string;
}

export function Pagination({
  page,
  totalPages,
  pageOfLabel,
  prevLabel,
  nextLabel,
  sortKey,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildHref(targetPage: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (targetPage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(targetPage));
    }
    // No es estrictamente necesario guardar sortKey en la URL porque
    // la página padre lo lee de searchParams; lo hacemos para que el
    // link sea self-contained.
    if (sortKey && sortKey !== "all") {
      // Si la tabla usa `sortBy` o `status` para filtrar, ya está en
      // searchParams; no tocamos nada extra. Este prop queda como hook
      // futuro si alguna tabla necesita un sort distinto.
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3">
      <span className="text-xs text-on-surface-variant">{pageOfLabel}</span>
      <div className="flex gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={prevDisabled}
          aria-label={prevLabel}
        >
          <Link
            href={buildHref(Math.max(1, page - 1))}
            aria-disabled={prevDisabled}
            className={prevDisabled ? "pointer-events-none opacity-50" : ""}
          >
            ← {prevLabel}
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={nextDisabled}
          aria-label={nextLabel}
        >
          <Link
            href={buildHref(Math.min(totalPages, page + 1))}
            aria-disabled={nextDisabled}
            className={nextDisabled ? "pointer-events-none opacity-50" : ""}
          >
            {nextLabel} →
          </Link>
        </Button>
      </div>
    </div>
  );
}
