"use client";

import {
  ArrowLeft,
  Check,
  Clipboard,
  FileImage,
  Filter,
  Images,
  Loader2,
  MoreHorizontal,
  Play,
  Search,
  Trash2,
  UploadCloud,
  Video,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AssetUploadPanel } from "@/components/asset-upload-panel";
import { assetCategories, assetStatuses, contentTypes } from "@/lib/constants";
import { formatAssetDuration } from "@/lib/assets";
import { formatDateTime } from "@/lib/format";
import type {
  AssetCategory,
  AssetStatus,
  CampusAsset,
  SchoolRecord,
  UserRole
} from "@/lib/types";

type Filters = {
  keyword: string;
  category: string;
  fileType: string;
  status: string;
  uploader: string;
  usage: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: Filters = {
  keyword: "",
  category: "全部",
  fileType: "全部",
  status: "全部",
  uploader: "全部",
  usage: "全部",
  dateFrom: "",
  dateTo: ""
};

function hasActiveFilters(filters: Filters) {
  return (
    filters.keyword !== "" ||
    filters.category !== "全部" ||
    filters.fileType !== "全部" ||
    filters.status !== "全部" ||
    filters.uploader !== "全部" ||
    filters.usage !== "全部" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== ""
  );
}

export function SchoolAssetsClient({
  assets,
  currentUserId,
  role,
  school
}: {
  assets: CampusAsset[];
  currentUserId: string;
  role: UserRole;
  school: SchoolRecord;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const uploaderOptions = useMemo(
    () =>
      Array.from(
        new Map(
          assets.map((asset) => [
            asset.uploader_id,
            asset.profiles?.full_name || asset.profiles?.email || "未知上传人"
          ])
        )
      ),
    [assets]
  );
  const filtered = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return assets.filter((asset) => {
      const searchText = [
        asset.file_name,
        asset.location,
        asset.remark,
        asset.profiles?.full_name,
        asset.profiles?.email,
        ...asset.tags
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const createdAt = asset.created_at.slice(0, 10);
      return (
        (!keyword || searchText.includes(keyword)) &&
        (filters.category === "全部" || asset.category === filters.category) &&
        (filters.fileType === "全部" || asset.file_type === filters.fileType) &&
        (filters.status === "全部" || asset.status === filters.status) &&
        (filters.uploader === "全部" || asset.uploader_id === filters.uploader) &&
        (filters.usage === "全部" || asset.usage_scene.includes(filters.usage)) &&
        (!filters.dateFrom || createdAt >= filters.dateFrom) &&
        (!filters.dateTo || createdAt <= filters.dateTo)
      );
    });
  }, [assets, filters]);

  const pendingCount = assets.filter((asset) => asset.status === "待审核").length;

  return (
    <div>
      <div className="mb-7 border-b border-line pb-6">
        <Link className="button-ghost -ml-3 mb-3 w-fit" href="/assets">
          <ArrowLeft size={16} />
          返回资源库
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-heading text-ink sm:text-[30px]">
              {school.name}素材
            </h1>
            <p className="mt-2 text-sm text-muted">
              {[school.campus_name, school.city].filter(Boolean).join(" · ")} · 共 {assets.length} 个素材
              {role === "admin" && pendingCount ? ` · ${pendingCount} 个待审核` : ""}
            </p>
          </div>
          <button className="button-primary" onClick={() => setShowUpload(true)} type="button">
            <UploadCloud size={16} />
            上传素材
          </button>
        </div>
      </div>

      {showUpload ? (
        <div className="mb-5">
          <AssetUploadPanel
            initialSchoolId={school.id}
            onClose={() => setShowUpload(false)}
            role={role}
            schools={[school]}
          />
        </div>
      ) : null}

      <div className="panel mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-light" size={16} />
            <input
              className="form-input pl-10"
              value={filters.keyword}
              onChange={(event) =>
                setFilters((current) => ({ ...current, keyword: event.target.value }))
              }
              placeholder="搜索素材名称、标签、地点或上传人"
            />
          </label>
          <select
            className="form-input lg:w-40"
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({ ...current, category: event.target.value }))
            }
          >
            <option value="全部">全部分类</option>
            {assetCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className="form-input lg:w-36"
            value={filters.fileType}
            onChange={(event) =>
              setFilters((current) => ({ ...current, fileType: event.target.value }))
            }
          >
            <option value="全部">图片和视频</option>
            <option value="图片">图片</option>
            <option value="视频">视频</option>
          </select>
          <button
            className="button-secondary"
            onClick={() => setShowMoreFilters((current) => !current)}
            type="button"
          >
            <Filter size={15} />
            更多筛选
          </button>
        </div>

        {showMoreFilters ? (
          <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2 xl:grid-cols-5">
            <select
              className="form-input"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="全部">全部状态</option>
              {assetStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              className="form-input"
              value={filters.uploader}
              onChange={(event) =>
                setFilters((current) => ({ ...current, uploader: event.target.value }))
              }
            >
              <option value="全部">全部上传人</option>
              {uploaderOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="form-input"
              value={filters.usage}
              onChange={(event) =>
                setFilters((current) => ({ ...current, usage: event.target.value }))
              }
            >
              <option value="全部">全部内容用途</option>
              {contentTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              className="form-input"
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateFrom: event.target.value }))
              }
              aria-label="上传开始日期"
            />
            <input
              className="form-input"
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateTo: event.target.value }))
              }
              aria-label="上传结束日期"
            />
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>已显示 {filtered.length} / {assets.length} 个素材</span>
          {hasActiveFilters(filters) ? (
            <button
              className="button-ghost min-h-0 px-2 py-1 text-xs"
              onClick={() => setFilters(emptyFilters)}
              type="button"
            >
              <X size={13} />
              清空筛选
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              canDelete={role === "admin" || asset.uploader_id === currentUserId}
              canEdit={role === "admin"}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Images size={25} strokeWidth={1.5} className="text-muted-light" />
          <h2 className="mt-3 text-sm font-semibold text-ink">没有匹配素材</h2>
          <p className="mt-1 text-xs text-muted">调整筛选条件，或上传这个学校的第一批素材。</p>
        </div>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  canDelete,
  canEdit
}: {
  asset: CampusAsset;
  canDelete: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const description = [
    asset.file_name,
    asset.category,
    asset.location ? `地点：${asset.location}` : "",
    asset.tags.length ? `标签：${asset.tags.join("、")}` : "",
    asset.usage_scene.length ? `适合：${asset.usage_scene.join("、")}` : "",
    asset.remark ?? ""
  ]
    .filter(Boolean)
    .join("\n");

  async function copyDescription() {
    await navigator.clipboard.writeText(description);
    setMessage("素材说明已复制");
    setTimeout(() => setMessage(""), 1800);
  }

  async function deleteAsset() {
    if (!window.confirm(`确认删除“${asset.file_name}”？删除后无法恢复。`)) {
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "删除失败。");
      return;
    }
    router.refresh();
  }

  return (
    <article className="panel overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-canvas-alt">
        {asset.signed_url ? (
          asset.file_type === "视频" ? (
            <video
              className="h-full w-full object-cover"
              controls
              muted
              playsInline
              preload="metadata"
              src={asset.signed_url}
            />
          ) : (
            <img
              alt={asset.file_name}
              className="h-full w-full object-cover"
              loading="lazy"
              src={asset.signed_url}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-muted-light">
            {asset.file_type === "视频" ? <Video size={27} /> : <FileImage size={27} />}
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <StatusBadge status={asset.status} />
          <span className="rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-ink backdrop-blur">
            {asset.category}
          </span>
        </div>
        {asset.file_type === "视频" && asset.duration_seconds !== null ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
            <Play size={10} fill="currentColor" />
            {formatAssetDuration(asset.duration_seconds)}
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-ink">{asset.file_name}</h2>
            <p className="mt-1 truncate text-xs text-muted">
              {asset.location || "未填写地点"} ·{" "}
              {asset.profiles?.full_name || asset.profiles?.email || "未知上传人"}
            </p>
          </div>
          <button
            className="button-ghost -mr-2 -mt-2 shrink-0"
            onClick={() => setShowActions((current) => !current)}
            type="button"
            aria-label="素材操作"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {asset.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {asset.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="badge bg-canvas-alt text-muted">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-3 text-[11px] text-muted-light">
          {formatDateTime(asset.created_at)}
          {asset.can_generate ? " · 可用于内容生成" : " · 不用于内容生成"}
        </p>

        {message ? (
          <div className="mt-3 rounded-md bg-canvas-alt px-3 py-2 text-xs text-muted">
            {message}
          </div>
        ) : null}

        {showActions ? (
          <div className="mt-3 grid gap-2 border-t border-line pt-3">
            <button className="button-secondary w-full text-xs" onClick={copyDescription} type="button">
              <Clipboard size={14} />
              复制素材说明
            </button>
            {canEdit ? (
              <button
                className="button-secondary w-full text-xs"
                onClick={() => setShowEdit((current) => !current)}
                type="button"
              >
                <Check size={14} />
                审核与编辑
              </button>
            ) : null}
            {canDelete ? (
              <button
                className="button-secondary w-full text-xs text-coral-600"
                disabled={busy}
                onClick={deleteAsset}
                type="button"
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                删除素材
              </button>
            ) : null}
          </div>
        ) : null}

        {showEdit ? (
          <AssetEditForm
            asset={asset}
            onMessage={setMessage}
            onSaved={() => {
              setShowEdit(false);
              router.refresh();
            }}
          />
        ) : null}
      </div>
    </article>
  );
}

function AssetEditForm({
  asset,
  onMessage,
  onSaved
}: {
  asset: CampusAsset;
  onMessage: (message: string) => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<AssetStatus>(asset.status);
  const [category, setCategory] = useState<AssetCategory>(asset.category);
  const [tags, setTags] = useState(asset.tags.join("、"));
  const [location, setLocation] = useState(asset.location ?? "");
  const [remark, setRemark] = useState(asset.remark ?? "");
  const [rejectionReason, setRejectionReason] = useState(asset.rejection_reason ?? "");
  const [canGenerate, setCanGenerate] = useState(asset.can_generate);
  const [usageScene, setUsageScene] = useState<string[]>(asset.usage_scene);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    onMessage("");
    const response = await fetch(`/api/assets/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        category,
        tags: tags.split(/[,，、\s]+/).filter(Boolean),
        location,
        remark,
        rejectionReason,
        canGenerate,
        usageScene
      })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      onMessage(data.error ?? "保存失败。");
      return;
    }
    onMessage("审核信息已保存");
    onSaved();
  }

  return (
    <form className="mt-4 space-y-3 border-t border-line pt-4" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-2">
        <select
          className="form-input text-xs"
          value={status}
          onChange={(event) => setStatus(event.target.value as AssetStatus)}
        >
          {assetStatuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="form-input text-xs"
          value={category}
          onChange={(event) => setCategory(event.target.value as AssetCategory)}
        >
          {assetCategories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <input
        className="form-input text-xs"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        placeholder="拍摄地点"
      />
      <input
        className="form-input text-xs"
        value={tags}
        onChange={(event) => setTags(event.target.value)}
        placeholder="标签，用顿号分隔"
      />
      <div className="flex flex-wrap gap-1.5">
        {contentTypes.map((item) => {
          const selected = usageScene.includes(item);
          return (
            <button
              key={item}
              className={[
                "rounded border px-2 py-1 text-[11px]",
                selected
                  ? "border-brand-700 bg-brand-900 text-white"
                  : "border-line bg-white text-muted"
              ].join(" ")}
              onClick={() =>
                setUsageScene((current) =>
                  current.includes(item)
                    ? current.filter((value) => value !== item)
                    : [...current, item]
                )
              }
              type="button"
            >
              {item}
            </button>
          );
        })}
      </div>
      <textarea
        className="form-input resize-y text-xs"
        rows={2}
        value={remark}
        onChange={(event) => setRemark(event.target.value)}
        placeholder="备注"
      />
      {status === "已驳回" ? (
        <textarea
          className="form-input resize-y text-xs"
          rows={2}
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          placeholder="驳回原因"
          required
        />
      ) : null}
      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          checked={canGenerate}
          onChange={(event) => setCanGenerate(event.target.checked)}
          type="checkbox"
        />
        可用于内容生成
      </label>
      <button className="button-primary w-full text-xs" disabled={saving} type="submit">
        {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
        保存审核
      </button>
    </form>
  );
}

function StatusBadge({ status }: { status: AssetStatus }) {
  const styles: Record<AssetStatus, string> = {
    待审核: "bg-amber-50 text-amber-700",
    已通过: "bg-emerald-50 text-emerald-700",
    已驳回: "bg-coral-50 text-coral-600",
    已归档: "bg-white/90 text-muted"
  };
  return (
    <span className={`rounded px-2 py-1 text-[11px] font-semibold backdrop-blur ${styles[status]}`}>
      {status}
    </span>
  );
}
