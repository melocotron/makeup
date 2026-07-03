import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LoginForm />;
}

function LoginForm() {
  const t = useTranslations("common");
  const tAdmin = useTranslations("admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-low px-4">
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-[var(--shadow-level-2)]">
        <div className="mb-8 text-center">
          <h1 className="font-display text-display text-on-surface">{tAdmin("title")}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{tAdmin("subtitle")}</p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Email
            </label>
            <input
              type="email"
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-on-primary transition-opacity hover:opacity-90"
          >
            {t("submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-on-surface-variant">
          🔒 Login funcional se implementa en la Fase 1 (changes/002-auth-admin)
        </p>
      </div>
    </div>
  );
}