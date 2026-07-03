import { AdminShell } from "@/components/admin/admin-shell";
import { Toaster } from "@/components/ui/sonner";
import { auth } from "@/server/auth";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  // Si no hay sesión, mostramos solo el children (la página login no necesita shell)
  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <>
      <Toaster />
      <AdminShell
        locale={locale}
        user={{
          name: session.user.name ?? "Admin",
          email: session.user.email ?? "",
        }}
      >
        {children}
      </AdminShell>
    </>
  );
}