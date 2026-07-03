"use client";

import { X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SidebarContent } from "./sidebar";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  locale: string;
}

export function MobileSidebar({ open, onClose, locale }: MobileSidebarProps) {
  React.useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative h-full w-64 max-w-[80vw] animate-in slide-in-from-left duration-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute -right-12 top-4 z-10 bg-surface text-on-surface shadow-[var(--shadow-level-2)]"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </Button>
        <SidebarContent locale={locale} onNavigate={onClose} />
      </div>
    </div>
  );
}