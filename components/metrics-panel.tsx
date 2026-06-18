"use client";

import { useRouter } from "next/navigation";
import { BarChart3, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import { compactNumber } from "@/lib/format";
import type { SchoolRecord } from "@/lib/types";

type Metric = {
  id: string;
  platform: string;
  post_url: string;
  post_title: string | null;
  views: number;
  likes: number;
  favorites: number;
  comments: number;
  shares: number;
  collected_at: string;
  schools?: { name: string; campus_name: string | null };
  profiles?: { full_name: string | null; email: string };
};

export function MetricsPanel({ schools }: { schools: SchoolRecord[] }) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [fetching, setFetching] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function autoFetch() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const postUrl = String(fd.get("post_url") || "");
    const platform = String(fd.get("platform") || "");
    if (!postUrl || !platform) { setMessage("请先填写链接和平台"); return; }

    setFetching(true);
    setMessage("");
    try {
      const res = await fetch("/api/fetch-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: postUrl, platform }),
      });
      const d = await res.json();
      if (res.ok && !d.error) {
        // Auto-fill form fields
        const inputs = formRef.current.querySelectorAll("input");
        const map: Record<string, string> = { views: String(d.views ?? 0), likes: String(d.likes ?? 0), favorites: String(d.favorites ?? 0), comments: String(d.comments ?? 0), shares: String(d.shares ?? 0) };
        inputs.forEach((inp: HTMLInputElement) => { if (map[inp.name]) inp.value = map[inp.name]; });
        const titleInput = formRef.current.querySelector("input[name='post_title']") as HTMLInputElement;
        if (titleInput && d.title) titleInput.value = d.title;
        setMessage(`已自动填充：${d.views?.toLocaleString() ?? 0} 播放 · ${d.likes?.toLocaleString() ?? 0} 赞`);
      } else {
        setMessage(d.error || "抓取失败，请手动填写");
      }
    } catch { setMessage("抓取出错，请手动填写"); }
    setFetching(false);
  }

  useEffect(() => {
    fetch("/api/publish-metrics")
      .then(r => r.json())
      .then(d => { setMetrics(d.metrics ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function deleteMetric(id: string) {
    if (!confirm("确定删除？")) return;
    const res = await fetch(`/api/publish-metrics?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMetrics(prev => prev.filter(m => m.id !== id));
      router.refresh();
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/publish-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: String(f.get("school_id")),
        platform: String(f.get("platform")),
        post_url: String(f.get("post_url")),
        post_title: String(f.get("post_title") || ""),
        views: Number(f.get("views")) || 0,
        likes: Number(f.get("likes")) || 0,
        favorites: Number(f.get("favorites")) || 0,
        comments: Number(f.get("comments")) || 0,
        shares: Number(f.get("shares")) || 0,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
      router.refresh();
      const r = await fetch("/api/publish-metrics");
      const d = await r.json();
      setMetrics(d.metrics ?? []);
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage(d.error ?? "保存失败");
    }
  }

  // 按学校聚合
  const bySchool: Record<string, { name: string; count: number; views: number; likes: number; favorites: number; comments: number }> = {};
  for (const m of metrics) {
    const key = m.schools?.name ?? "未命名";
    if (!bySchool[key]) bySchool[key] = { name: key, count: 0, views: 0, likes: 0, favorites: 0, comments: 0 };
    bySchool[key].count += 1;
    bySchool[key].views += m.views;
    bySchool[key].likes += m.likes;
    bySchool[key].favorites += m.favorites;
    bySchool[key].comments += m.comments;
  }
  const schoolRows = Object.values(bySchool).sort((a, b) => b.views - a.views);

  const totalMetrics = metrics.reduce((s, m) => ({
    views: s.views + m.views,
    likes: s.likes + m.likes,
    favorites: s.favorites + m.favorites,
    comments: s.comments + m.comments,
    shares: s.shares + m.shares,
  }), { views: 0, likes: 0, favorites: 0, comments: 0, shares: 0 });

  if (loading) return <div className="panel p-5 text-sm text-muted">加载作品数据...</div>;

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      {/* 作品数据列表 */}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/50 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-ink">作品数据</h2>
            <p className="mt-0.5 text-xs text-muted-light">{metrics.length} 条 · {compactNumber(totalMetrics.views)} 播放</p>
          </div>
          <button className="button-secondary text-xs" onClick={() => setShowForm(!showForm)} type="button">
            <Plus size={13} />
            {showForm ? "收起" : "上传数据"}
          </button>
        </div>

        {showForm ? (
          <form ref={formRef} className="grid gap-3 border-b border-line/50 bg-canvas-alt/40 px-5 py-4 sm:grid-cols-4" onSubmit={submit}>
            <select className="form-input" name="school_id" required>
              <option value="">选择学校</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="form-input" name="platform" required defaultValue="小红书">
              <option value="小红书">小红书</option>
              <option value="抖音">抖音</option>
            </select>
            <input className="form-input sm:col-span-2" name="post_url" required placeholder="作品链接" />
            <div className="sm:col-span-4 grid grid-cols-4 gap-2">
              <input className="form-input" name="views" type="number" placeholder="播放量" />
              <input className="form-input" name="likes" type="number" placeholder="点赞数" />
              <input className="form-input" name="comments" type="number" placeholder="评论数" />
              <input className="form-input" name="shares" type="number" placeholder="分享数" />
            </div>
            <div className="sm:col-span-4 flex items-center gap-3">
              <button className="button-primary text-xs" disabled={saving} type="submit">
                {saving ? <Loader2 className="animate-spin" size={13} /> : <Plus size={13} />}
                保存
              </button>
              {message ? <span className="text-xs text-coral-600">{message}</span> : null}
              <span className="text-[11px] text-muted-light">在抖音/小红书 APP 里查看数据，填入上方表格</span>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-line/50 bg-canvas-alt/40">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">作品</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">学校</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">播放</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">点赞</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">收藏</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">评论</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">分享</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {metrics.length ? metrics.map(m => (
                <tr key={m.id} className="transition-colors hover:bg-canvas-alt/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={m.platform as "小红书" | "抖音"} />
                      <a href={m.post_url} target="_blank" className="text-[13px] font-medium text-brand-600 hover:underline line-clamp-1 max-w-[200px]" rel="noreferrer">
                        {m.post_title || m.post_url.slice(0, 40)}
                      </a>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-light">{m.profiles?.full_name ?? m.profiles?.email?.replace(/^u_|@campus\.local$/g, "")}</p>
                  </td>
                  <td className="px-5 py-3 text-[12px]">{m.schools?.name ?? "-"}</td>
                  <td className="px-5 py-3 text-[13px] font-semibold tabular-nums">{compactNumber(m.views)}</td>
                  <td className="px-5 py-3 text-[13px] tabular-nums">{compactNumber(m.likes)}</td>
                  <td className="px-5 py-3 text-[13px] tabular-nums">{compactNumber(m.favorites)}</td>
                  <td className="px-5 py-3 text-[13px] tabular-nums">{compactNumber(m.comments)}</td>
                  <td className="px-5 py-3 text-[13px] tabular-nums">{compactNumber(m.shares)}</td>
                  <td className="px-5 py-3">
                    <button className="button-ghost text-[11px] text-muted-light hover:text-coral-600 p-1" onClick={() => deleteMetric(m.id)} type="button" title="删除">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-[13px] text-muted-light">暂无作品数据，点「上传数据」开始</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 学校排行榜 */}
      <section className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line/50 px-5 py-3.5">
          <BarChart3 size={16} className="text-brand-500" />
          <h2 className="text-sm font-bold text-ink">学校转化表现</h2>
        </div>
        <div className="divide-y divide-line/50">
          {schoolRows.length ? schoolRows.map((row, i) => (
            <div key={row.name} className="px-5 py-4 transition-colors hover:bg-canvas-alt/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-light tabular-nums">#{i + 1}</span>
                  <span className="text-[13px] font-semibold text-ink">{row.name}</span>
                </div>
                <span className="text-[13px] font-bold text-ink tabular-nums">{compactNumber(row.views)} 播放</span>
              </div>
              <div className="mt-1.5 flex gap-3 text-[11px] text-muted-light">
                <span>{row.count} 作品</span>
                <span>{compactNumber(row.likes)} 赞</span>
                <span>{compactNumber(row.favorites)} 收藏</span>
                <span>{compactNumber(row.comments)} 评论</span>
              </div>
            </div>
          )) : (
            <div className="px-5 py-10 text-center text-[13px] text-muted-light">暂无数据</div>
          )}
        </div>
      </section>
    </div>
  );
}
