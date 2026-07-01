"use client";

import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import type { UserRole } from "@/lib/types";

type Account = {
  id: string;
  platform: string;
  account_name: string;
  account_id?: string;
  account_link?: string;
  notes?: string;
  user_id: string;
  schools?: { name: string; campus_name?: string };
  profiles?: { full_name: string | null; email: string };
};

export function DashboardAccounts({ role, userId }: { role: UserRole; userId: string }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/platform-accounts")
      .then(r => r.json())
      .then(d => { setAccounts(d.accounts ?? d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function addAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/platform-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        schoolId: String(f.get("school_id")),
        platform: String(f.get("platform")),
        accountName: String(f.get("account_name")),
        accountId: String(f.get("account_id") || ""),
        accountLink: String(f.get("account_link") || ""),
        notes: String(f.get("notes") || ""),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      router.refresh();
      // Refresh accounts
      const r = await fetch("/api/platform-accounts");
      const d = await r.json();
      setAccounts(d.accounts ?? d);
    } else {
      const d = await res.json().catch(() => ({}));
      setMessage(d.error ?? "保存失败");
    }
  }

  if (loading) return <div className="panel p-5 text-sm text-muted">加载账号...</div>;

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/50 px-5 py-3.5">
        <h2 className="text-sm font-bold text-ink">
          我的账号 · {accounts.length} 个
        </h2>
        <button className="button-secondary text-xs" onClick={() => setShowForm(!showForm)} type="button">
          <Plus size={13} />
          {showForm ? "收起" : "新增账号"}
        </button>
      </div>

      {showForm ? (
        <form className="grid gap-3 border-b border-line/50 bg-canvas-alt/40 px-5 py-4 sm:grid-cols-3" onSubmit={addAccount}>
          <select className="form-input" name="platform" required defaultValue="小红书">
            <option value="小红书">小红书</option>
            <option value="抖音">抖音</option>
            <option value="视频号">视频号</option>
          </select>
          <input className="form-input" name="account_name" required placeholder="账号名称" />
          <input className="form-input" name="account_id" placeholder="账号ID（选填）" />
          <input className="form-input" name="account_link" placeholder="链接（选填）" />
          <input className="form-input" name="notes" placeholder="备注（选填）" />
          <div className="sm:col-span-3 flex items-center gap-3">
            <button className="button-primary text-xs" disabled={saving} type="submit">
              {saving ? <Loader2 className="animate-spin" size={13} /> : <Plus size={13} />}
              保存
            </button>
            {message ? <span className="text-xs text-coral-600">{message}</span> : null}
          </div>
        </form>
      ) : null}

      <div className="divide-y divide-line/50">
        {accounts.length ? accounts.map(acc => (
          <div key={acc.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <PlatformBadge platform={acc.platform as "小红书" | "抖音" | "视频号"} />
                <span className="text-[13px] font-semibold text-ink">{acc.account_name}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-light">
                {acc.account_id ? <span>ID: {acc.account_id}</span> : null}
                {acc.notes ? <span>{acc.notes}</span> : null}
              </div>
            </div>
          </div>
        )) : (
          <div className="px-5 py-8 text-center text-[13px] text-muted-light">
            暂无账号，点右上角「新增账号」
          </div>
        )}
      </div>
    </section>
  );
}
