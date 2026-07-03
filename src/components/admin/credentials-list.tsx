"use client";

import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";

import { CredentialFormDialog } from "./credential-form-dialog";
import { deleteCredentialAction } from "@/server/content/credentials";

export interface Credential {
  id: string;
  title: Record<string, string>;
  institution: string;
  year: number | null;
  image: string | null;
  order: number;
  createdAt: Date;
}

interface CredentialsListProps {
  initialData: Credential[];
}

export function CredentialsList({ initialData }: CredentialsListProps) {
  const t = useTranslations("admin.credentials");
  const [items, setItems] = useState(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);

  function handleNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(cred: Credential) {
    setEditing(cred);
    setDialogOpen(true);
  }

  function handleSuccess() {
    // Reload via window.location for simplicity (avoids complex client refresh)
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    const result = await deleteCredentialAction(id);
    if (result.success) {
      toast.success(t("deleted"));
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4" />
          {t("newCredential")}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <GraduationCap className="h-12 w-12 text-outline" />
          <p className="mt-4 text-sm font-semibold text-on-surface">{t("emptyTitle")}</p>
          <p className="mt-1 max-w-sm text-xs text-on-surface-variant">{t("emptyDesc")}</p>
          <Button onClick={handleNew} className="mt-4" variant="outline">
            <Plus className="h-4 w-4" />
            {t("addFirst")}
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-outline-variant">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16" />
                <TableHead>{t("titleEs")}</TableHead>
                <TableHead>{t("institution")}</TableHead>
                <TableHead className="w-24">{t("year")}</TableHead>
                <TableHead className="w-16">{t("order")}</TableHead>
                <TableHead className="w-32 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((cred) => (
                <TableRow key={cred.id}>
                  <TableCell>
                    {cred.image ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded bg-surface-container">
                        <Image
                          src={cred.image}
                          alt={cred.title.es ?? ""}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-container text-on-surface-variant">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-on-surface">
                    {cred.title.es ?? "—"}
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {cred.institution}
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {cred.year ?? "—"}
                  </TableCell>
                  <TableCell className="text-on-surface-variant">
                    {cred.order}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(cred)}
                        aria-label={t("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(cred.id)}
                        aria-label={t("delete")}
                        className="text-error hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CredentialFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        credential={
          editing
            ? {
                id: editing.id,
                titleEs: editing.title.es ?? "",
                titleEn: editing.title.en ?? "",
                institution: editing.institution,
                year: editing.year,
                image: editing.image,
                order: editing.order,
              }
            : null
        }
        onSuccess={handleSuccess}
      />
    </div>
  );
}