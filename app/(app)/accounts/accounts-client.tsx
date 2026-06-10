"use client";

import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import type { SchoolRecord } from "@/lib/types";

type Account = {
  id: string;
  platform: "抖音" | "小红书";
  school_id: string;
  account_name: string;
  account_id?: string;
  account_password?: string;
  account_link?: string;
  notes?: string;
  schools?: { name: string; campus_name: string | null };
};

export function AccountsClient({ schools }: { schools: SchoolRecord[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/platform-accounts")
      .then(r => r.json())
      .then(d => { setAccounts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    const body = {
      school_id: String(form.get("school_id")),
      platform: String(form.get("platform")),
      account_name: String(form.get("account_name")),
      account_id: String(form.get("account_id") || ""),
      account_password: String(form.get("account_password") || ""),
      account_link: String(form.get("account_link") || ""),
      notes: String(form.get("notes") || ""),
    };
    const res = await fetch("/api/platform-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      setMessage("保存成功");
      router.refresh();
      // Reload list
      const r = await fetch("/api/platform-accounts");
      const d = await r.json();
      setAccounts(Array.isArray(d) ? d : []);
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage(d.error ?? "保存失败");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      {/* 添加账号表单 */}
      <section className="panel p-5">
        <h2 className="text-sm font-bold text-ink">添加账号</h2>
        <form className="mt-4 space-y-3.5" onSubmit={submit}>
          <label className="block">
            <span className="form-label">平台</span>
            <select className="form-input mt-1" name="platform" required defaultValue="抖音">
              <option value="抖音">抖音</option>
              <option value="小红书">小红书</option>
            </select>
          </label>
          <label className="block">
            <span className="form-label">学校</span>
            <select className="form-input mt-1" name="school_id" required>
              <option value="">选择学校</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{[s.name, s.campus_name].filter(Boolean).join(" ")}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="form-label">账号名称</span>
            <input className="form-input mt-1" name="account_name" required placeholder="如：乌鲁木齐校园攻略" />
          </label>
          <label className="block">
            <span className="form-label">账号 ID</span>
            <input className="form-input mt-1" name="account_id" placeholder="抖音号/小红书号" />
          </label>
          <label className="block">
            <span className="form-label">密码</span>
            <input className="form-input mt-1" name="account_password" placeholder="登录密码" />
          </label>
          <label className="block">
            <span className="form-label">账号链接（选填）</span>
            <input className="form-input mt-1" name="account_link" placeholder="https://..." />
          </label>
          <label className="block">
            <span className="form-label">备注（选填）</span>
            <textarea className="form-input mt-1 resize-y" name="notes" rows={2} />
          </label>
          {message ? <div className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-muted">{message}</div> : null}
          <button className="button-primary w-full" disabled={saving} type="submit">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            保存账号
          </button>
        </form>
      </section>

      {/* 账号列表 */}
      <section className="panel overflow-hidden">
        <div className="border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
          <h2 className="text-sm font-bold text-ink">账号列表</h2>
        </div>
        <div className="divide-y divide-line/50">
          {loading ? (
            <div className="px-5 py-10 text-center text-[13px] text-muted-light">加载中...</div>
          ) : accounts.length ? (
            accounts.map(acc => (
              <div key={acc.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={acc.platform} />
                      <h3 className="text-[13px] font-semibold text-ink">{acc.account_name}</h3>
                    </div>
                    <p className="mt-1 text-[12px] text-muted-light">
                      {acc.schools?.name ?? "-"}
                      {acc.schools?.campus_name ? ` · ${acc.schools.campus_name}` : ""}
                    </p>
                    {acc.account_id ? <p className="mt-1 text-[11px] text-muted-light">ID: {acc.account_id}</p> : null}
                    {acc.account_password ? (
                      <p className="mt-1 text-[11px] text-muted-light">
                        密码: {acc.account_password}
                        <button
                          type="button"
                          className="ml-1.5 text-brand-600 hover:underline"
                          onClick={() => { navigator.clipboard.writeText(acc.account_password!); }}
                        >
                          复制
                        </button>
                      </p>
                    ) : null}
                    {acc.account_link ? (
                      <a href={acc.account_link} target="_blank" className="mt-0.5 inline-block text-[11px] text-brand-600 hover:underline" rel="noreferrer">
                        查看主页 →
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-10 text-center text-[13px] text-muted-light">暂无账号，添加一个</div>
          )}
        </div>
      </section>
    </div>
  );
}
