"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateAboutContentAction } from "@/server/content/profile.actions";
import type { AboutContentFormData } from "@/server/content/validators";

interface ProfileFormProps {
  initialData: {
    bioEs: string;
    bioEn: string;
    signatureText: string;
    image: string | null;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const t = useTranslations("admin.profile");
  const tCommon = useTranslations("common");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
  } = useForm<AboutContentFormData>({
    defaultValues: {
      bioEs: initialData.bioEs,
      bioEn: initialData.bioEn,
      signatureText: initialData.signatureText,
      image: initialData.image ?? "",
    },
  });

  const imageValue = watch("image");

  async function onSubmit(data: AboutContentFormData) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    }
    const result = await updateAboutContentAction(fd);
    if (result.success) {
      toast.success(t("saved"));
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("image")}</CardTitle>
          <CardDescription>{t("imageDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaPicker
            value={imageValue ? { id: imageValue, url: imageValue } : null}
            onChange={(m) => setValue("image", m?.url ?? "", { shouldDirty: true })}
            folder="perfil"
            label={t("image")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("bio")}</CardTitle>
          <CardDescription>{t("bioDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bioEs">Español</Label>
            <Textarea id="bioEs" rows={5} {...register("bioEs")} />
            {errors.bioEs && (
              <p className="text-xs text-error">{errors.bioEs.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bioEn">English</Label>
            <Textarea id="bioEn" rows={5} {...register("bioEn")} />
            {errors.bioEn && (
              <p className="text-xs text-error">{errors.bioEn.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("signature")}</CardTitle>
          <CardDescription>{t("signatureDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            {...register("signatureText")}
            placeholder="Con amor, María"
            maxLength={200}
          />
          {errors.signatureText && (
            <p className="mt-1 text-xs text-error">{errors.signatureText.message}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
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