"use client";

import { ArrowRight, Image as ImageIcon, Images, Search, UploadCloud, Video, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AssetUploadPanel } from "@/components/asset-upload-panel";
import { formatDateTime } from "@/lib/format";
import type { AssetFileType, SchoolRecord, UserRole } from "@/lib/types";

type SchoolSummary = {
  school: SchoolRecord;
  total: number;
  images: number;
  videos: number;
  latestAt: string | null;
  owner: string;
  previewUrl: string | null;
  previewType: AssetFileType | null;
};

export function AssetsOverview({
  role,
  schools,
  summaries
}: {
  role: UserRole;
  schools: SchoolRecord[];
  summaries: SchoolSummary[];
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return summaries;
    return summaries.filter(({ school, owner }) =>
      [school.name, school.campus_name, school.city, owner]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword))
    );
  }, [query, summaries]);

  const totalAssets = summaries.reduce((sum, item) => sum + item.total, 0);
  const totalImages = summaries.reduce((sum, item) => sum + item.images, 0);
  const totalVideos = summaries.reduce((sum, item) => sum + item.videos, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat icon={Images} label="素材总数" value={totalAssets} />
        <SummaryStat icon={ImageIcon} label="图片" value={totalImages} />
        <SummaryStat icon={Video} label="视频" value={totalVideos} />
      </div>

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light" size={16} />
          <input
            className="form-input pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索学校、城市或负责人"
          />
        </label>
        <button className="button-primary shrink-0" onClick={() => setShowUpload(true)} type="button">
          <UploadCloud size={16} />
          上传素材
        </button>
      </div>

      {showUpload ? (
        <AssetUploadPanel
          role={role}
          schools={schools}
          onClose={() => setShowUpload(false)}
        />
      ) : null}

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((summary) => (
            <SchoolAlbumCard key={summary.school.id} summary={summary} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <X size={20} className="text-muted" />
          <p className="mt-3 text-sm font-semibold text-ink">没有匹配的学校</p>
          <p className="mt-1 text-xs text-muted">换一个学校名称、城市或负责人试试。</p>
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Images;
  label: string;
  value: number;
}) {
  return (
    <div className="panel flex items-center gap-4 p-4">
      <div className="icon-circle-brand">
        <Icon size={18} strokeWidth={1.7} />
      </div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      </div>
    </div>
  );
}

function SchoolAlbumCard({ summary }: { summary: SchoolSummary }) {
  const { school } = summary;

  return (
    <article className="panel overflow-hidden transition-colors hover:border-brand-400">
      <div className="relative aspect-[16/9] overflow-hidden bg-canvas-alt">
        {summary.previewUrl ? (
          summary.previewType === "视频" ? (
            <video
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
              src={summary.previewUrl}
            />
          ) : (
            <img
              alt={`${school.name}素材预览`}
              className="h-full w-full object-cover"
              src={summary.previewUrl}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-muted-light">
            <Images size={28} strokeWidth={1.4} />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-ink backdrop-blur">
          {summary.total} 个素材
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-ink">
              {school.name}
            </h2>
            <p className="mt-1 truncate text-xs text-muted">
              {[school.campus_name, school.city].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2 text-xs text-muted">
            <span>{summary.images} 图</span>
            <span>{summary.videos} 视频</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
          <div>
            <p className="text-muted-light">负责人</p>
            <p className="mt-1 truncate font-medium text-ink-soft">{summary.owner}</p>
          </div>
          <div>
            <p className="text-muted-light">最近上传</p>
            <p className="mt-1 truncate font-medium text-ink-soft">
              {summary.latestAt ? formatDateTime(summary.latestAt) : "暂无素材"}
            </p>
          </div>
        </div>
        <Link className="button-secondary mt-4 w-full" href={`/assets/${school.id}`}>
          进入学校素材
          <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}

