"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface-container-lowest group-[.toaster]:text-on-surface group-[.toaster]:border-outline-variant group-[.toaster]:shadow-[var(--shadow-level-2)]",
          description: "group-[.toast]:text-on-surface-variant",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-on-primary",
          cancelButton: "group-[.toast]:bg-surface-container group-[.toast]:text-on-surface",
          error: "group-[.toast]:border-error group-[.toast]:text-error",
          success: "group-[.toast]:border-tertiary group-[.toast]:text-tertiary",
        },
      }}
      {...props}
    />
  );
}