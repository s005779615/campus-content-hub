"use client";

import { Camera, Loader2, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function AvatarUpload({ url }: { url: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError("图片不能超过 2MB");
      return;
    }
    setError("");
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/me/avatar", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "上传失败");
      return;
    }
    const d = await res.json();
    setPreview(d.url);
    router.refresh();
  }

  async function handleRemove() {
    setLoading(true);
    await fetch("/api/me/avatar", { method: "DELETE" });
    setPreview(null);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas-alt"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? (
          <Loader2 size={24} className="animate-spin text-brand-500" />
        ) : preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={18} className="text-white" />
            </div>
          </>
        ) : (
          <User size={28} className="text-brand-500" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </button>
      <div>
        <p className="text-sm font-semibold text-ink">头像</p>
        <p className="text-xs text-muted-light mt-0.5">点击更换，最大 2MB</p>
        {error ? <p className="text-xs text-coral-500 mt-1">{error}</p> : null}
      </div>
      {preview ? (
        <button
          type="button"
          className="button-ghost text-xs text-muted-light hover:text-coral-600"
          onClick={handleRemove}
        >
          <Trash2 size={14} />
          移除
        </button>
      ) : null}
    </div>
  );
}
