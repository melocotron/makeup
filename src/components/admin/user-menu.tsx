"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Avatar, AvatarFallback, getInitials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/server/auth/actions";
import type { Locale } from "@/i18n/routing";

interface UserMenuProps {
  user: { name: string; email: string };
}

export function UserMenu({ user }: UserMenuProps) {
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;

  async function handleLogout() {
    try {
      // Server Action signOut -> throws NEXT_REDIRECT, Next.js lo maneja
      await logout(locale);
    } catch {
      // NEXT_REDIRECT es capturado por Next.js, no por nosotros
      // Si llega aquí es otro error, no pasa nada
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full p-0"
          aria-label={t("userMenu.openMenu")}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-2">
          <p className="text-sm font-semibold text-on-surface">{user.name}</p>
          <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("userMenu.account")}</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          <UserIcon className="h-4 w-4" />
          {t("userMenu.myAccount")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault();
            void handleLogout();
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}