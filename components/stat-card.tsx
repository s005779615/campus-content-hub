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
    <div className="group panel gradient-strip-top p-4 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-light">{title}</p>
          <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-ink">{value}</p>
          {helper ? (
            <p className="mt-1.5 text-[11px] text-muted-light">{helper}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 group-hover:text-brand-700">
            <Icon size={20} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
