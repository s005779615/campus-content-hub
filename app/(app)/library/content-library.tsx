"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Send } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { ContentOutput } from "@/components/content-output";
import { PlatformBadge } from "@/components/platform-badge";
import { RiskAlert } from "@/components/risk-alert";
import { platforms } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ContentRecord } from "@/lib/types";

export function ContentLibrary({
  contents,
  activeTaskId
}: {
  contents: ContentRecord[];
  activeTaskId?: string;
}) {
  const [platform, setPlatform] = useState("全部");
  const [school, setSchool] = useState("全部");

  const schoolOptions = useMemo(
    () =>
      Array.from(
        new Set(contents.map((item) => item.schools?.name).filter(Boolean) as string[])
      ),
    [contents]
  );

  const filtered = contents.filter((item) => {
    const matchPlatform = platform === "全部" || item.platform === platform;
    const matchSchool = school === "全部" || item.schools?.name === school;
    return matchPlatform && matchSchool;
  });

  return (
    <div className="space-y-4">
      <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
        <label className="block sm:w-48">
          <span className="form-label">平台</span>
          <select className="form-input mt-1" value={platform} onChange={(event) => setPlatform(event.target.value)}>
            <option value="全部">全部平台</option>
            {platforms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:w-56">
          <span className="form-label">学校</span>
          <select className="form-input mt-1" value={school} onChange={(event) => setSchool(event.target.value)}>
            <option value="全部">全部学校</option>
            {schoolOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted-light">
          共 {filtered.length} 条内容
        </span>
      </div>

      <div className="space-y-4">
        {filtered.map((content) => (
          <ContentCard key={content.id} content={content} activeTaskId={activeTaskId} />
        ))}
      </div>
    </div>
  );
}

function ContentCard({
  content,
  activeTaskId
}: {
  content: ContentRecord;
  activeTaskId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const publicationCount = content.publication_records?.length ?? 0;
  const latestPublication = content.publication_records?.[0];

  async function submitPublication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    form.set("contentId", content.id);
    if (activeTaskId || content.task_id) {
      form.set("taskId", activeTaskId || content.task_id || "");
    }

    const response = await fetch("/api/publications", {
      method: "POST",
      body: form
    });

    setSubmitting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "回填失败，请稍后重试。");
      return;
    }

    setMessage("发布数据已保存。");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <article className="panel overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <PlatformBadge platform={content.platform} />
            <h2 className="truncate text-[15px] font-semibold text-ink">
              {content.content_type} · {content.schools?.name ?? "未命名学校"}
            </h2>
          </div>
          <p className="mt-1.5 text-[12px] text-muted-light">
            {content.content_goal} · {content.tone} · {formatDateTime(content.created_at)}
            {content.profiles ? ` · ${content.profiles.full_name || content.profiles.email}` : ""}
          </p>
          <p className="mt-2 text-[12px] text-muted">
            <span className="mr-2 rounded bg-canvas-alt px-2 py-0.5">{content.status}</span>
            发布回填 {publicationCount} 条
            {latestPublication ? ` · 最近播放 ${latestPublication.views.toLocaleString()}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="button-secondary text-xs"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "收起内容" : "查看内容"}
          </button>
          <button
            className="button-primary text-xs"
            onClick={() => setShowPublish((current) => !current)}
            type="button"
          >
            <Send size={15} />
            回填发布数据
          </button>
        </div>
      </div>

      {content.risk_hits?.length ? (
        <div className="px-5 pb-4">
          <RiskAlert hits={content.risk_hits} />
        </div>
      ) : null}

      {open ? (
        <div className="border-t border-line/50 bg-canvas-alt/30 p-5">
          <ContentOutput platform={content.platform} output={content.output} />
        </div>
      ) : null}

      {showPublish ? (
        <form className="border-t border-line/50 bg-canvas-alt/40 p-5" onSubmit={submitPublication}>
          <h3 className="mb-4 text-sm font-semibold text-ink">发布数据回填</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="form-label">发布时间</span>
              <input className="form-input mt-1" name="publishedAt" type="datetime-local" />
            </label>
            <label className="block sm:col-span-2 xl:col-span-3">
              <span className="form-label">发布链接</span>
              <input className="form-input mt-1" name="publishUrl" type="url" placeholder="https://..." />
            </label>
            {[
              ["views", "播放量"],
              ["comments", "评论量"],
              ["privateMessages", "私信人数"],
              ["wechatAdds", "加微信人数"],
              ["validInquiries", "有效咨询人数"],
              ["conversions", "成交人数"]
            ].map(([name, label]) => (
              <label key={name} className="block">
                <span className="form-label">{label}</span>
                <input className="form-input mt-1" name={name} type="number" min="0" defaultValue="0" />
              </label>
            ))}
            <label className="block">
              <span className="form-label">成交金额</span>
              <input className="form-input mt-1" name="revenue" type="number" min="0" step="0.01" defaultValue="0" />
            </label>
            <label className="block sm:col-span-2 xl:col-span-4">
              <span className="form-label">备注</span>
              <textarea className="form-input mt-1 resize-y" name="notes" rows={3} />
            </label>
          </div>

          {message ? (
            <div className="mt-4 rounded-lg border border-line bg-white px-4 py-2.5 text-[13px] text-muted">
              {message}
            </div>
          ) : null}

          <button className="button-primary mt-4" disabled={submitting} type="submit">
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            保存发布数据
          </button>
        </form>
      ) : null}
    </article>
  );
}
