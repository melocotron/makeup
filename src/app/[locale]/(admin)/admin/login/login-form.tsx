"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Botón de submit con loading state. Se usa dentro de un <form> con
 * `action={loginAction}` (server action) para que el browser muestre
 * el spinner mientras el server action se ejecuta.
 */
export function LoginSubmitButton() {
  const tCommon = useTranslations("common");
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full" size="lg">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {tCommon("loading")}
        </>
      ) : (
        tCommon("submit")
      )}
    </Button>
  );
}