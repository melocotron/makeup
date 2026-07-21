"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { changePostStatus } from "@/server/blog/actions";

export interface PostStatusActionsProps {
  postId: string;
  currentStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

/**
 * Botones de cambio rápido de status: Publicar, Archivar, Volver a
 * borrador. Usa changePostStatus (shortcut action que solo cambia
 * el status, sin tocar el resto).
 */
export function PostStatusActions({
  postId,
  currentStatus,
}: PostStatusActionsProps) {
  const t = useTranslations("admin.blog");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  function change(next: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    if (next === currentStatus) return;
    setPendingStatus(next);
    startTransition(async () => {
      const result = await changePostStatus({ id: postId, status: next });
      setPendingStatus(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("form.statusUpdated"));
      router.refresh();
    });
  }

  const isLoading = isPending;

  return (
    <div className="flex items-center gap-2">
      {currentStatus !== "PUBLISHED" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => change("PUBLISHED")}
          disabled={isLoading}
        >
          {pendingStatus === "PUBLISHED" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {t("actions.publish")}
        </Button>
      )}
      {currentStatus === "PUBLISHED" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => change("ARCHIVED")}
          disabled={isLoading}
        >
          {pendingStatus === "ARCHIVED" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {t("actions.archive")}
        </Button>
      )}
      {currentStatus === "ARCHIVED" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => change("DRAFT")}
          disabled={isLoading}
        >
          {pendingStatus === "DRAFT" && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {t("actions.unarchive")}
        </Button>
      )}
    </div>
  );
}
