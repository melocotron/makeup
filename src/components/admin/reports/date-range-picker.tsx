"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DATE_PRESETS,
  type DatePreset,
} from "@/server/reports/validators";

// ============================================================================
// Date range picker
// ============================================================================

/**
 * Sincroniza la URL con el rango de fechas elegido.
 *
 * Decisión: usamos la URL como única fuente de verdad (no estado local
 * persistente). Eso permite compartir links con un rango pre-seleccionado
 * y mantener la UI coherente con el back/forward del navegador.
 *
 * Para `preset=custom` el componente muestra dos inputs de fecha
 * (from/to) y un botón "Aplicar" que escribe en la URL.
 */
export function DateRangePicker() {
  const t = useTranslations("admin.reports.dateRange");
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPreset = (searchParams.get("preset") ?? "last30") as DatePreset;
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  // Estado local para los inputs custom. Solo se escribe a la URL al
  // pulsar "Aplicar".
  const [customFrom, setCustomFrom] = useState(currentFrom);
  const [customTo, setCustomTo] = useState(currentTo);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si la URL cambia desde fuera, sincronizamos los inputs custom.
    setCustomFrom(currentFrom);
    setCustomTo(currentTo);
  }, [currentFrom, currentTo]);

  function navigate(params: URLSearchParams) {
    const qs = params.toString();
    // Next.js 15 necesita una URL completa para que el cambio de
    // search params se refleje en router events. Construimos la URL
    // absoluta desde el pathname actual.
    const currentPath = window.location.pathname;
    router.push(qs ? `${currentPath}?${qs}` : currentPath, { scroll: false });
  }

  function setPreset(preset: DatePreset) {
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    if (preset === "custom") {
      // Mantenemos from/to si existen, sino vacíos.
      params.set("preset", "custom");
    } else {
      params.delete("preset");
      params.delete("from");
      params.delete("to");
      params.set("preset", preset);
    }
    navigate(params);
  }

  function applyCustom() {
    if (!customFrom || !customTo) {
      setError("Fechas requeridas");
      return;
    }
    if (customFrom > customTo) {
      setError(t("invalid"));
      return;
    }
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    navigate(params);
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-outline-variant bg-surface-container-lowest p-4">
      <p className="text-sm font-semibold text-on-surface">{t("label")}</p>

      <div
        role="tablist"
        aria-label={t("label")}
        className="flex flex-wrap gap-2"
      >
        {DATE_PRESETS.map((preset) => {
          const active = preset === currentPreset;
          return (
            <button
              key={preset}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPreset(preset)}
              className={
                active
                  ? "rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary"
                  : "rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container"
              }
            >
              {t(`presets.${preset}`)}
            </button>
          );
        })}
      </div>

      {currentPreset === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-on-surface-variant">
              {t("from")}
            </span>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-on-surface-variant">
              {t("to")}
            </span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-40"
            />
          </label>
          <Button type="button" onClick={applyCustom} size="sm">
            {t("apply")}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
