"use client";

import * as React from "react";

import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { Topbar } from "./topbar";

interface AdminShellProps {
  locale: string;
  user: { name: string; email: string };
  children: React.ReactNode;
}

export function AdminShell({ locale, user, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar locale={locale} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} locale={locale} />

      <div className="flex flex-1 flex-col">
        <Topbar user={user} onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}