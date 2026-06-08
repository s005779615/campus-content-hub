import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  helper,
  icon: Icon
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
          {helper ? <p className="mt-1 text-xs text-muted">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-md bg-brand-50 p-2 text-brand-700">
            <Icon size={18} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
