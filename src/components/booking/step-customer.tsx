"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type CustomerInput = {
  name: string;
  email: string;
  phone: string;
  notes?: string;
};

export function StepCustomer({
  initial,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  initial?: Partial<CustomerInput>;
  onSubmit: (data: CustomerInput) => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const t = useTranslations("booking");
  const [data, setData] = useState<CustomerInput>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = validate(data, t);
  const isValid = Object.keys(errors).length === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      notes: true,
    });
    if (!isValid) return;
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-semibold text-on-surface">
        {t("step3Title")}
      </h2>

      <div className="space-y-2">
        <Label htmlFor="booking-name">{t("fields.name")} *</Label>
        <Input
          id="booking-name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          onBlur={() => setTouched({ ...touched, name: true })}
          aria-invalid={touched.name && !!errors.name}
          className={cn(
            touched.name && errors.name && "border-error",
          )}
          required
          autoComplete="name"
        />
        {touched.name && errors.name && (
          <p className="text-sm text-error">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-email">{t("fields.email")} *</Label>
        <Input
          id="booking-email"
          type="email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          onBlur={() => setTouched({ ...touched, email: true })}
          aria-invalid={touched.email && !!errors.email}
          className={cn(touched.email && errors.email && "border-error")}
          required
          autoComplete="email"
        />
        {touched.email && errors.email && (
          <p className="text-sm text-error">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-phone">{t("fields.phone")} *</Label>
        <Input
          id="booking-phone"
          type="tel"
          value={data.phone}
          onChange={(e) => setData({ ...data, phone: e.target.value })}
          onBlur={() => setTouched({ ...touched, phone: true })}
          aria-invalid={touched.phone && !!errors.phone}
          className={cn(touched.phone && errors.phone && "border-error")}
          required
          autoComplete="tel"
        />
        {touched.phone && errors.phone && (
          <p className="text-sm text-error">{errors.phone}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-notes">{t("fields.notes")}</Label>
        <Textarea
          id="booking-notes"
          value={data.notes}
          onChange={(e) => setData({ ...data, notes: e.target.value })}
          onBlur={() => setTouched({ ...touched, notes: true })}
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-outline">{t("fields.notesHint")}</p>
      </div>

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
          {t("back")}
        </Button>
        <Button type="submit" disabled={!isValid || submitting}>
          {submitting ? t("submitting") : t("continue")}
        </Button>
      </div>
    </form>
  );
}

function validate(
  data: CustomerInput,
  t: ReturnType<typeof useTranslations<"booking">>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (data.name.trim().length < 2) errors.name = t("errors.nameTooShort");
  if (data.name.trim().length > 100) errors.name = t("errors.nameTooLong");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = t("errors.emailInvalid");
  if (!/^[\d\s+()\-]{8,}$/.test(data.phone))
    errors.phone = t("errors.phoneInvalid");
  if ((data.notes?.length ?? 0) > 500) errors.notes = t("errors.notesTooLong");
  return errors;
}