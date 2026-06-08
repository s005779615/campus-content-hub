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
    <div className="panel flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <div className="rounded-md bg-canvas p-3 text-muted">
        <Icon size={22} />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
