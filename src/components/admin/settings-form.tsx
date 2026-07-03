"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateSettingsAction } from "@/server/system/actions";
import { settingsSchema, type SettingsFormData } from "@/server/system/validators";

interface SettingsFormProps {
  initialData: SettingsFormData;
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const t = useTranslations("admin.settings");
  const tCommon = useTranslations("common");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialData,
  });

  const blogEnabled = watch("blogEnabled");
  const offersEnabled = watch("offersEnabled");
  const loyaltyEnabled = watch("loyaltyEnabled");
  const maintenanceMode = watch("maintenanceMode");

  async function onSubmit(data: SettingsFormData) {
    const result = await updateSettingsAction(toFormData(data));
    if (result.success) {
      toast.success(t("saved"));
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">{t("tab.general")}</TabsTrigger>
          <TabsTrigger value="contact">{t("tab.contact")}</TabsTrigger>
          <TabsTrigger value="social">{t("tab.social")}</TabsTrigger>
          <TabsTrigger value="features">{t("tab.features")}</TabsTrigger>
          <TabsTrigger value="maintenance">{t("tab.maintenance")}</TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t("general.title")}</CardTitle>
              <CardDescription>{t("general.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t("general.siteName")} error={errors.siteName?.message} required>
                <Input {...register("siteName")} placeholder="Radiant Beauty" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("general.minAdvance")} error={errors.minAdvanceHours?.message}>
                  <Input
                    type="number"
                    min="0"
                    max="720"
                    {...register("minAdvanceHours")}
                  />
                </Field>
                <Field label={t("general.cancelHours")} error={errors.cancelHours?.message}>
                  <Input
                    type="number"
                    min="0"
                    max="720"
                    {...register("cancelHours")}
                  />
                </Field>
              </div>
              <Field label={t("general.metaTitle")} error={errors.metaTitle?.message}>
                <Input {...register("metaTitle")} placeholder="Radiant Beauty - Belleza y cuidado de la piel" />
              </Field>
              <Field label={t("general.metaDesc")} error={errors.metaDesc?.message}>
                <Input {...register("metaDesc")} placeholder="Servicios profesionales de maquillaje..." />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTACTO */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>{t("contact.title")}</CardTitle>
              <CardDescription>{t("contact.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email" error={errors.email?.message}>
                  <Input type="email" {...register("email")} placeholder="info@radiant-beauty.com" />
                </Field>
                <Field label={t("contact.phone")} error={errors.phone?.message}>
                  <Input {...register("phone")} placeholder="+34 612 345 678" />
                </Field>
              </div>
              <Field label={t("contact.whatsapp")} error={errors.whatsapp?.message}>
                <Input {...register("whatsapp")} placeholder="+34 612 345 678" />
              </Field>
              <Field label={t("contact.address")} error={errors.address?.message}>
                <Input {...register("address")} placeholder="Calle Principal 123, Madrid" />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REDES SOCIALES */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>{t("social.title")}</CardTitle>
              <CardDescription>{t("social.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Instagram" error={errors.instagram?.message}>
                <Input
                  type="url"
                  {...register("instagram")}
                  placeholder="https://instagram.com/radiant.beauty"
                />
              </Field>
              <Field label="Facebook" error={errors.facebook?.message}>
                <Input
                  type="url"
                  {...register("facebook")}
                  placeholder="https://facebook.com/radiant.beauty"
                />
              </Field>
              <Field label="TikTok" error={errors.tiktok?.message}>
                <Input
                  type="url"
                  {...register("tiktok")}
                  placeholder="https://tiktok.com/@radiant.beauty"
                />
              </Field>
              <Field label="YouTube" error={errors.youtube?.message}>
                <Input
                  type="url"
                  {...register("youtube")}
                  placeholder="https://youtube.com/@radiant.beauty"
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEATURES TOGGLES */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>{t("features.title")}</CardTitle>
              <CardDescription>{t("features.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleField
                label={t("features.blog")}
                description={t("features.blogDesc")}
                checked={blogEnabled}
                onChange={(v) => setValue("blogEnabled", v, { shouldDirty: true })}
              />
              <ToggleField
                label={t("features.offers")}
                description={t("features.offersDesc")}
                checked={offersEnabled}
                onChange={(v) => setValue("offersEnabled", v, { shouldDirty: true })}
              />
              <ToggleField
                label={t("features.loyalty")}
                description={t("features.loyaltyDesc")}
                checked={loyaltyEnabled}
                onChange={(v) => setValue("loyaltyEnabled", v, { shouldDirty: true })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANTENIMIENTO */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>{t("maintenance.title")}</CardTitle>
              <CardDescription>{t("maintenance.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleField
                label={t("maintenance.mode")}
                description={t("maintenance.modeDesc")}
                checked={maintenanceMode}
                onChange={(v) => setValue("maintenanceMode", v, { shouldDirty: true })}
              />
              <Field label={t("maintenance.message")} error={errors.maintenanceMessage?.message}>
                <Input
                  {...register("maintenanceMessage")}
                  placeholder="Estamos haciendo mejoras. Volvemos pronto."
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit bar fija */}
      <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-lowest/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon("loading")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {tCommon("save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, error, required, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-error"> *</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleField({ label, description, checked, onChange }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-on-surface">{label}</p>
        {description && <p className="mt-0.5 text-xs text-on-surface-variant">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function toFormData(data: SettingsFormData): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "boolean") {
      fd.append(key, value ? "true" : "false");
    } else if (value !== null && value !== undefined) {
      fd.append(key, String(value));
    }
  }
  return fd;
}