"use client";

import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Loader2, Plus, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { UserRole } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

type Agent = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  managed_by: string | null;
  last_login_at: string | null;
  created_at: string;
  stats?: { publish: number; ai: number; asset: number };
};

export function AgentsClient({ role, userId }: { role: UserRole; userId: string }) {
  const router = useRouter();
  const canManage = role === "admin" || role === "member";
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then(d => { setAgents(d.agents ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(form.get("username")),
        password: String(form.get("password")),
        fullName: String(form.get("fullName") || ""),
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      setAgents(prev => [...prev, d.agent]);
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      setMessage(d.error ?? "创建失败");
    }
  }

  async function toggleActive(agent: Agent) {
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !agent.is_active }),
    });
    if (res.ok) {
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, is_active: !a.is_active } : a));
      router.refresh();
    }
  }

  async function deleteAgent(id: string) {
    if (!confirm("确定删除该代理账号？")) return;
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAgents(prev => prev.filter(a => a.id !== id));
      router.refresh();
    }
  }

  if (loading) {
    return <div className="panel p-8 text-center text-sm text-muted">加载中...</div>;
  }

  return (
    <div className="space-y-5">
      {canManage ? (
        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">
              代理列表 · {agents.length} 人
            </h2>
            <button className="button-primary text-xs" onClick={() => setShowForm(!showForm)} type="button">
              {showForm ? "收起" : <><Plus size={14} /> 创建代理</>}
            </button>
          </div>

          {showForm ? (
            <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={create}>
              <input className="form-input" name="username" required placeholder="账号名（英文+数字）" />
              <input className="form-input" name="password" type="password" required minLength={6} placeholder="密码至少6位" />
              <input className="form-input" name="fullName" placeholder="姓名（选填）" />
              <div className="sm:col-span-3 flex items-center gap-3">
                <button className="button-primary" disabled={saving} type="submit">
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
                  创建代理
                </button>
                {message ? <span className="text-xs text-coral-600">{message}</span> : null}
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-line/50 bg-canvas-alt/40">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">账号</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">角色</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">发布</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">AI使用</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">状态</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">最近登录</th>
                {canManage ? <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">操作</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {agents.length ? agents.map(agent => (
                <tr key={agent.id} className="transition-colors hover:bg-canvas-alt/30">
                  <td className="px-5 py-3">
                    <p className="text-[13px] font-semibold text-ink">{agent.full_name || agent.email?.replace(/^u_|@campus\.local$/g, "")}</p>
                    <p className="text-[11px] text-muted-light">{agent.email?.replace(/^u_|@campus\.local$/g, "")}</p>
                  </td>
                  <td className="px-5 py-3"><span className="badge bg-canvas-alt text-muted">代理</span></td>
                  <td className="px-5 py-3 text-[13px] tabular-nums">{agent.stats?.publish ?? 0}</td>
                  <td className="px-5 py-3 text-[13px] tabular-nums">{agent.stats?.ai ?? 0}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${agent.is_active ? "bg-brand-50 text-brand-700" : "bg-coral-50 text-coral-600"}`}>
                      {agent.is_active ? "启用" : "已禁用"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-muted-light">
                    {agent.last_login_at ? formatDateTime(agent.last_login_at) : "从未登录"}
                  </td>
                  {canManage ? (
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        <button
                          className="button-secondary !text-[11px] !px-2.5 !py-1"
                          onClick={() => toggleActive(agent)}
                          type="button"
                        >
                          {agent.is_active ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                          {agent.is_active ? "禁用" : "启用"}
                        </button>
                        {role === "admin" ? (
                          <button
                            className="button-secondary !text-[11px] !px-2.5 !py-1 text-coral-600"
                            onClick={() => deleteAgent(agent.id)}
                            type="button"
                          >
                            删除
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              )) : (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-5 py-10 text-center text-[13px] text-muted-light">
                    {canManage ? "暂无代理账号，点击上方创建" : "暂无代理数据"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
