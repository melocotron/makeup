"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ExtraDraft {
  nameEs: string;
  nameEn: string;
  price: number;
}

interface ExtrasManagerProps {
  value: ExtraDraft[];
  onChange: (extras: ExtraDraft[]) => void;
}

export function ExtrasManager({ value, onChange }: ExtrasManagerProps) {
  const t = useTranslations("admin.catalog.services");

  const [draft, setDraft] = React.useState<ExtraDraft>({
    nameEs: "",
    nameEn: "",
    price: 0,
  });
  const [error, setError] = React.useState<string | null>(null);

  function handleAdd() {
    setError(null);
    if (!draft.nameEs.trim() || !draft.nameEn.trim()) {
      setError("Completa nombre en ambos idiomas");
      return;
    }
    if (draft.price < 0 || isNaN(draft.price)) {
      setError("Precio inválido");
      return;
    }
    onChange([...value, { ...draft, nameEs: draft.nameEs.trim(), nameEn: draft.nameEn.trim() }]);
    setDraft({ nameEs: "", nameEn: "", price: 0 });
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3 rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <div>
        <Label>{t("extras")}</Label>
        <p className="text-xs text-on-surface-variant">
          Materiales o servicios adicionales que el cliente puede agregar.
        </p>
      </div>

      {/* Lista de extras agregados */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((extra, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 rounded-md border border-outline-variant bg-surface-container-lowest p-2"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface">{extra.nameEs}</p>
                <p className="text-xs text-on-surface-variant">
                  {extra.nameEn} · +${extra.price.toFixed(2)}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(i)}
                aria-label={t("removeExtra")}
                className="text-error hover:text-error"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Mini form para agregar */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_120px_auto]">
        <Input
          placeholder="Nombre (ES)"
          value={draft.nameEs}
          onChange={(e) => setDraft({ ...draft, nameEs: e.target.value })}
        />
        <Input
          placeholder="Name (EN)"
          value={draft.nameEn}
          onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="$0.00"
          value={draft.price || ""}
          onChange={(e) =>
            setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })
          }
        />
        <Button type="button" variant="outline" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          {t("addExtra")}
        </Button>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}