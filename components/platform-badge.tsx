import clsx from "clsx";

const badgeStyle: Record<string, string> = {
  "小红书": "bg-coral-50 text-coral-700 border-coral-200",
  "抖音": "bg-ink text-white border-ink",
  "视频号": "bg-skyline-50 text-skyline-700 border-skyline-200",
};

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        badgeStyle[platform] ?? "border-line bg-white text-muted"
      )}
    >
      {platform}
    </span>
  );
}
