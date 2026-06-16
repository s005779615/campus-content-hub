"use client";

import { Check, Loader2, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { assetCategories, contentTypes } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AssetCategory, SchoolRecord, UserRole } from "@/lib/types";

type UploadFile = {
  file: File;
  durationSeconds: number | null;
};

const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "mp4", "mov"]);
const maxFileSize = 200 * 1024 * 1024;

function normalizedMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "mov") return "video/quicktime";
  if (extension === "mp4") return "video/mp4";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

function getVideoDuration(file: File) {
  if (!normalizedMimeType(file).startsWith("video/")) {
    return Promise.resolve(null);
  }

  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    video.src = objectUrl;
  });
}

export function AssetUploadPanel({
  schools,
  role,
  initialSchoolId,
  onClose
}: {
  schools: SchoolRecord[];
  role: UserRole;
  initialSchoolId?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [schoolId, setSchoolId] = useState(initialSchoolId ?? schools[0]?.id ?? "");
  const [category, setCategory] = useState<AssetCategory>("其他");
  const [assetName, setAssetName] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");
  const [remark, setRemark] = useState("");
  const [usageScene, setUsageScene] = useState<string[]>([]);
  const [canGenerate, setCanGenerate] = useState(true);
  const [requiresReview, setRequiresReview] = useState(true);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error">("info");

  const totalSize = useMemo(
    () => files.reduce((sum, item) => sum + item.file.size, 0),
    [files]
  );

  async function chooseFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    setMessage("");
    const accepted: UploadFile[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(fileList)) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!allowedExtensions.has(extension) || file.size > maxFileSize || file.size === 0) {
        rejected.push(file.name);
        continue;
      }
      accepted.push({
        file,
        durationSeconds: await getVideoDuration(file)
      });
    }

    setFiles(accepted);
    if (rejected.length) {
      setMessage(`已忽略不支持或超过 200MB 的文件：${rejected.join("、")}`);
      setMessageType("error");
    }
  }

  function toggleUsage(item: string) {
    setUsageScene((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item]
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolId || files.length === 0) {
      setMessage("请选择学校和至少一个素材文件。");
      setMessageType("error");
      return;
    }

    setUploading(true);
    setMessage("");
    setMessageType("info");
    const supabase = createSupabaseBrowserClient();
    const tagList = tags
      .split(/[,，\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      for (let index = 0; index < files.length; index += 1) {
        const item = files[index];
        const mimeType = normalizedMimeType(item.file);
        setProgress(`正在上传 ${index + 1}/${files.length}：${item.file.name}`);

        // Step 1: Get signed URL
        const urlResponse = await fetch("/api/assets/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId,
            fileName: item.file.name,
            mimeType,
            fileSize: item.file.size
          })
        });
        const urlData = (await urlResponse.json()) as {
          path?: string;
          token?: string;
          error?: string;
        };

        if (!urlResponse.ok || !urlData.path || !urlData.token) {
          throw new Error(`获取上传地址失败(${urlResponse.status})：${urlData.error || "未知错误"}`);
        }

        // Step 2: Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("campus-assets")
          .uploadToSignedUrl(urlData.path, urlData.token, item.file, {
            contentType: mimeType
          });

        if (uploadError) {
          throw new Error(`存储上传失败：${uploadError.message}`);
        }

        // Step 3: Save metadata
        const baseName = item.file.name.replace(/\.[^.]+$/, "");
        const displayName =
          assetName.trim() && files.length > 1
            ? `${assetName.trim()} ${index + 1}`
            : assetName.trim() || baseName;
        const metadataResponse = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId,
            storagePath: urlData.path,
            mimeType,
            fileName: displayName,
            fileSize: item.file.size,
            durationSeconds: item.durationSeconds,
            category,
            tags: tagList,
            location,
            usageScene,
            remark,
            canGenerate,
            requiresReview
          })
        });
        const metadata = (await metadataResponse.json()) as { error?: string; asset?: unknown };

        if (!metadataResponse.ok) {
          throw new Error(`第三步元数据保存失败(${metadataResponse.status})：${metadata.error || "未知错误"}`);
        }
      }

      setFiles([]);
      setAssetName("");
      setTags("");
      setRemark("");
      if (inputRef.current) inputRef.current.value = "";
      setMessage(
        role === "admin" && !requiresReview
          ? "素材已上传并直接通过审核。"
          : "素材已上传，等待管理员审核。"
      );
      setMessageType("info");
      setProgress("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败，请稍后重试。");
      setMessageType("error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="panel p-5 sm:p-6" onSubmit={submit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">上传校园素材</h2>
          <p className="mt-1 text-[13px] leading-6 text-muted">
            支持 jpg、png、webp、mp4、mov，可一次选择多个文件。
          </p>
        </div>
        {onClose ? (
          <button className="button-ghost" onClick={onClose} type="button" aria-label="关闭上传">
            <X size={18} />
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="form-label">所属学校</span>
          <select
            className="form-input"
            disabled={Boolean(initialSchoolId)}
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
            required
          >
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {[school.name, school.campus_name].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="form-label">素材类型</span>
          <select
            className="form-input"
            value={category}
            onChange={(event) => setCategory(event.target.value as AssetCategory)}
          >
            {assetCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="form-label">素材名称</span>
          <input
            className="form-input"
            value={assetName}
            onChange={(event) => setAssetName(event.target.value)}
            placeholder="不填则使用文件名"
          />
        </label>
        <label className="block">
          <span className="form-label">拍摄地点</span>
          <input
            className="form-input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="例如：南门、二食堂"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="form-label">标签</span>
          <input
            className="form-input"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="多个标签用逗号或空格分隔"
          />
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="form-label">适合内容类型</legend>
        <div className="flex flex-wrap gap-2">
          {contentTypes.map((item) => {
            const selected = usageScene.includes(item);
            return (
              <button
                key={item}
                className={[
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
                  selected
                    ? "border-brand-700 bg-brand-900 text-white"
                    : "border-line bg-white text-muted hover:border-brand-400 hover:text-ink"
                ].join(" ")}
                onClick={() => toggleUsage(item)}
                type="button"
              >
                {selected ? <Check size={13} /> : null}
                {item}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-4 block">
        <span className="form-label">备注</span>
        <textarea
          className="form-input resize-y"
          rows={3}
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
          placeholder="说明画面内容、可用角度或注意事项"
        />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-canvas-alt px-4 text-sm text-ink-soft">
          <input
            checked={canGenerate}
            onChange={(event) => setCanGenerate(event.target.checked)}
            type="checkbox"
          />
          可用于内容生成
        </label>
        {role === "admin" ? (
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-canvas-alt px-4 text-sm text-ink-soft">
            <input
              checked={requiresReview}
              onChange={(event) => setRequiresReview(event.target.checked)}
              type="checkbox"
            />
            需要审核
          </label>
        ) : (
          <div className="flex min-h-11 items-center rounded-lg border border-line bg-canvas-alt px-4 text-sm text-muted">
            队员上传后默认进入待审核
          </div>
        )}
      </div>

      <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line bg-canvas-alt/50 px-5 py-6 text-center transition-colors hover:border-brand-400 hover:bg-white">
        <UploadCloud size={24} strokeWidth={1.6} className="text-muted" />
        <span className="mt-2 text-sm font-semibold text-ink">选择图片或视频</span>
        <span className="mt-1 text-xs text-muted">单个文件不超过 200MB</span>
        <input
          ref={inputRef}
          accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          className="sr-only"
          multiple
          onChange={(event) => chooseFiles(event.target.files)}
          type="file"
        />
      </label>

      {files.length ? (
        <div className="mt-3 rounded-lg border border-line bg-white px-4 py-3 text-[13px] text-muted">
          已选择 {files.length} 个文件，共 {(totalSize / 1024 / 1024).toFixed(1)}MB
        </div>
      ) : null}

      {message || progress ? (
        <div
          className={[
            "mt-4 rounded-lg border px-4 py-3 text-[13px]",
            messageType === "error"
              ? "border-coral-100 bg-coral-50 text-coral-600"
              : "border-line bg-canvas-alt text-muted"
          ].join(" ")}
        >
          {progress || message}
        </div>
      ) : null}

      <button className="button-primary mt-4 w-full sm:w-auto" disabled={uploading} type="submit">
        {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
        {uploading ? "正在上传" : `上传 ${files.length || ""} 个素材`}
      </button>
    </form>
  );
}
