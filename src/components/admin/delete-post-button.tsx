"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { deletePost } from "@/server/blog/actions";

export interface DeletePostButtonProps {
  postId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

/**
 * Botón de eliminar post. Si el post está PUBLISHED, requiere
 * confirmación adicional (force=true) porque es contenido público.
 */
export function DeletePostButton({ postId, status }: DeletePostButtonProps) {
  const t = useTranslations("admin.blog");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (status === "PUBLISHED") {
      const confirmed = confirm(
        "Este post está publicado. ¿Eliminarlo de todos modos? Esta acción no se puede deshacer.",
      );
      if (!confirmed) return;
      startTransition(async () => {
        const result = await deletePost({ id: postId, force: true });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(t("form.deleted"));
        router.push("/es/admin/blog");
      });
      return;
    }
    if (!confirm(t("confirmDelete"))) return;
    startTransition(async () => {
      const result = await deletePost({ id: postId, force: false });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("form.deleted"));
      router.push("/es/admin/blog");
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      className="text-error hover:text-error"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {tCommon("delete")}
    </Button>
  );
}
