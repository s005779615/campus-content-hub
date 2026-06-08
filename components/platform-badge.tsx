import clsx from "clsx";
import { platformAccent } from "@/lib/constants";

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        platformAccent[platform] ?? "border-line bg-white text-muted"
      )}
    >
      {platform}
    </span>
  );
}
