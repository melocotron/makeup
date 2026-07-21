"use client";

import { FileDown, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

// ============================================================================
// Export buttons (CSV + PDF)
// ============================================================================

/**
 * Construye los links de export a partir de los search params actuales
 * (preset, from, to, groupBy). El admin no elige nada extra: la URL
 * captura el estado del report.
 *
 * Decisión: usamos <a download> en vez de <Link> porque la API route
 * devuelve un attachment; el navegador debe tratarlo como descarga,
 * no como navegación. <Link> haría que Next.js intentara hacer
 * client-side routing y fallaría.
 */
export function ExportButtons() {
  const t = useTranslations("admin.reports.export");
  const searchParams = useSearchParams();

  const queryString = searchParams.toString();
  const csvHref = queryString
    ? `/api/admin/reports/export.csv?${queryString}`
    : "/api/admin/reports/export.csv";
  const pdfHref = queryString
    ? `/api/admin/reports/export.pdf?${queryString}`
    : "/api/admin/reports/export.pdf";

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("title")}>
      <Button asChild variant="outline" size="sm">
        <a href={csvHref} download>
          <FileText className="mr-2 h-4 w-4" />
          {t("csv")}
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={pdfHref} download>
          <FileDown className="mr-2 h-4 w-4" />
          {t("pdf")}
        </a>
      </Button>
    </div>
  );
}
