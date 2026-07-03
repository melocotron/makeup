"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ItemDraft {
  serviceId: string;
  quantity: number;
}

export interface AvailableService {
  id: string;
  name: Record<string, string>;
  durationMin: number;
  basePrice: number;
}

interface PackageItemsPickerProps {
  available: AvailableService[];
  value: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
}

export function PackageItemsPicker({
  available,
  value,
  onChange,
}: PackageItemsPickerProps) {
  const t = useTranslations("admin.catalog.packages");

  const [pickingId, setPickingId] = React.useState<string>("");
  const [pickingQty, setPickingQty] = React.useState<number>(1);

  const selectedServiceIds = new Set(value.map((v) => v.serviceId));
  const remaining = available.filter((s) => !selectedServiceIds.has(s.id));

  function handleAdd() {
    if (!pickingId) return;
    onChange([...value, { serviceId: pickingId, quantity: pickingQty }]);
    setPickingId("");
    setPickingQty(1);
  }

  function handleRemove(serviceId: string) {
    onChange(value.filter((v) => v.serviceId !== serviceId));
  }

  function handleQtyChange(serviceId: string, quantity: number) {
    onChange(
      value.map((v) => (v.serviceId === serviceId ? { ...v, quantity } : v)),
    );
  }

  function getService(id: string) {
    return available.find((s) => s.id === id);
  }

  return (
    <div className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          {t("items")}
        </p>
        <p className="text-xs text-on-surface-variant">
          {t("itemsDescription")}
        </p>
      </div>

      {/* Lista de items agregados */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item) => {
            const svc = getService(item.serviceId);
            if (!svc) return null;
            return (
              <div
                key={item.serviceId}
                className="flex items-center gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-2"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-on-surface">
                    {svc.name.es ?? "—"}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {svc.durationMin} min · ${svc.basePrice.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-on-surface-variant">×</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={item.quantity}
                    onChange={(e) =>
                      handleQtyChange(item.serviceId, parseInt(e.target.value) || 1)
                    }
                    className={cn(
                      "h-8 w-14 rounded-md border border-outline bg-surface-container-lowest px-2 text-center text-sm",
                      "focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none",
                    )}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(item.serviceId)}
                  aria-label="Quitar"
                  className="text-error hover:text-error"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Selector para agregar */}
      {remaining.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={pickingId}
            onChange={(e) => setPickingId(e.target.value)}
            className="h-10 flex-1 rounded-lg border border-outline bg-surface-container-lowest px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="">Selecciona un servicio...</option>
            {remaining.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.es ?? "—"} ({s.durationMin} min)
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-on-surface-variant">×</span>
            <input
              type="number"
              min="1"
              max="10"
              value={pickingQty}
              onChange={(e) => setPickingQty(parseInt(e.target.value) || 1)}
              className="h-10 w-16 rounded-lg border border-outline bg-surface-container-lowest px-3 text-center text-sm focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <Button type="button" variant="outline" onClick={handleAdd} disabled={!pickingId}>
              <Plus className="h-4 w-4" />
              {t("addItem")}
            </Button>
          </div>
        </div>
      ) : value.length > 0 ? (
        <p className="text-xs text-on-surface-variant">
          Todos los servicios disponibles ya están agregados.
        </p>
      ) : (
        <p className="text-xs text-error">No hay servicios disponibles. Crea servicios primero.</p>
      )}
    </div>
  );
}