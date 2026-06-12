import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas-alt/40 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white text-muted-light">
        <Icon size={21} strokeWidth={1.7} />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-[13px] leading-6 text-muted">{description}</p>
    </div>
  );
}
