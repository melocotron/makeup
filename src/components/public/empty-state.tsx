import { useTranslations } from "next-intl";

export function EmptyState({
  namespace,
  messageKey,
  icon,
}: {
  namespace: "services" | "packages";
  messageKey: string;
  icon?: React.ReactNode;
}) {
  const t = useTranslations(`public.${namespace}`);
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low py-16 text-center">
      {icon && <div className="mb-4 text-outline">{icon}</div>}
      <p className="text-sm text-on-surface-variant">{t(messageKey)}</p>
    </div>
  );
}
