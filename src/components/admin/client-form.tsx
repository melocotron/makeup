"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createClientAction,
  updateClientAction,
} from "@/server/clients/actions";
import { createClientSchema, updateClientSchema } from "@/server/clients/validators";

interface ClientFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    email: string;
    name: string;
    phone: string;
    notes: string;
  };
}

type FormData = {
  email: string;
  name: string;
  phone: string;
  notes: string;
};

export function ClientForm({ mode, initialData }: ClientFormProps) {
  const t = useTranslations("admin.clients");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(mode === "create" ? createClientSchema : updateClientSchema),
    defaultValues: {
      email: initialData?.email ?? "",
      name: initialData?.name ?? "",
      phone: initialData?.phone ?? "",
      notes: initialData?.notes ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    }
    if (mode === "edit" && initialData) {
      fd.append("id", initialData.id);
    }

    const result =
      mode === "create"
        ? await createClientAction(fd)
        : await updateClientAction(fd);

    if (result.success) {
      toast.success(mode === "create" ? t("created") : t("updated"));
      if (mode === "create" && "id" in result && result.id) {
        router.push(`/admin/clients/${result.id}`);
      } else {
        router.refresh();
      }
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("form.basicInfo")}</CardTitle>
          <CardDescription>{t("form.basicInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("form.name")} *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-error">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("form.email")} *</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-error">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("form.phone")} *</Label>
              <Input id="phone" type="tel" {...register("phone")} />
              {errors.phone && (
                <p className="text-xs text-error">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("form.notes")}</Label>
            <Textarea id="notes" rows={4} {...register("notes")} />
            {errors.notes && (
              <p className="text-xs text-error">{errors.notes.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/clients")}
        >
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting || (mode === "edit" && !isDirty)}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon("loading")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create" ? t("create") : tCommon("save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
