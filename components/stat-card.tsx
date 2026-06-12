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
    <div className="group min-w-0 bg-white px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{title}</p>
          <p className="mt-3 text-[30px] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</p>
          {helper ? (
            <p className="mt-2 text-xs text-muted-light">{helper}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-light transition-colors group-hover:text-ink">
            <Icon size={18} strokeWidth={1.7} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
