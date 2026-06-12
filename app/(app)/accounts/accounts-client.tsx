"use client";

import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import { accountPositionings, platforms } from "@/lib/constants";
import type {
  AccountStatus,
  PlatformAccount,
  Profile,
  SchoolRecord,
  UserRole
} from "@/lib/types";

const accountStatuses: AccountStatus[] = ["启用", "暂停", "异常"];

function personName(profile?: Pick<Profile, "full_name" | "email"> | null) {
  if (!profile) return "未分配";
  return profile.full_name || profile.email.replace(/^u_|@campus\.local$/g, "");
}

export function AccountsClient({
  initialAccounts,
  schools,
  members,
  role
}: {
  initialAccounts: PlatformAccount[];
  schools: SchoolRecord[];
  members: Profile[];
  role: UserRole;
}) {
  const router = useRouter();
  const manager = role === "admin";
  const [accounts, setAccounts] = useState(initialAccounts);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("全部");

  const visibleAccounts = useMemo(
    () =>
      ownerFilter === "全部"
        ? accounts
        : accounts.filter((account) => account.user_id === ownerFilter),
    [accounts, ownerFilter]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/platform-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: String(form.get("userId") ?? ""),
        schoolId: String(form.get("schoolId") ?? ""),
        platform: String(form.get("platform") ?? ""),
        accountName: String(form.get("accountName") ?? ""),
        accountId: String(form.get("accountId") ?? ""),
        accountPassword: String(form.get("accountPassword") ?? ""),
        accountLink: String(form.get("accountLink") ?? ""),
        accountPositioning: String(form.get("accountPositioning") ?? ""),
        dailyPublishTarget: Number(form.get("dailyPublishTarget") ?? 1),
        status: String(form.get("status") ?? "启用"),
        notes: String(form.get("notes") ?? "")
      })
    });

    setSaving(false);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "保存分配失败。");
      return;
    }

    const saved = data.account as PlatformAccount;
    setAccounts((current) => [
      saved,
      ...current.filter(
        (item) =>
          !(
            item.user_id === saved.user_id &&
            item.school_id === saved.school_id &&
            item.platform === saved.platform
          )
      )
    ]);
    setMessage("校园分配已保存。");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {manager ? (
        <section className="panel p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-ink">新增或更新分配</h2>
            <p className="mt-1 text-sm text-muted">同一队员、学校和平台会自动更新原分配。</p>
          </div>
          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
            <label>
              <span className="form-label">负责人</span>
              <select className="form-input" name="userId" required>
                <option value="">选择队员</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {personName(member)} · 校区负责人
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">学校</span>
              <select className="form-input" name="schoolId" required>
                <option value="">选择学校</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name} · {school.city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">平台</span>
              <select className="form-input" name="platform" defaultValue="小红书">
                {platforms.map((platform) => (
                  <option key={platform}>{platform}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">账号定位</span>
              <select className="form-input" name="accountPositioning" defaultValue="校园生活号">
                {accountPositionings.map((positioning) => (
                  <option key={positioning}>{positioning}</option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="form-label">账号名称</span>
              <input className="form-input" name="accountName" required placeholder="例如：新疆大学新生攻略" />
            </label>
            <label>
              <span className="form-label">每日发布目标</span>
              <input className="form-input" name="dailyPublishTarget" type="number" min="1" defaultValue="1" />
            </label>
            <label>
              <span className="form-label">当前状态</span>
              <select className="form-input" name="status" defaultValue="启用">
                {accountStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">账号 ID</span>
              <input className="form-input" name="accountId" placeholder="选填" />
            </label>
            <label>
              <span className="form-label">登录密码</span>
              <input className="form-input" name="accountPassword" placeholder="选填" />
            </label>
            <label className="md:col-span-2">
              <span className="form-label">账号链接</span>
              <input className="form-input" name="accountLink" type="url" placeholder="https://..." />
            </label>
            <label className="md:col-span-2 xl:col-span-3">
              <span className="form-label">备注</span>
              <input className="form-input" name="notes" placeholder="账号使用要求或注意事项" />
            </label>
            <div className="flex items-end">
              <button className="button-primary w-full" disabled={saving} type="submit">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                保存分配
              </button>
            </div>
          </form>
          {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
        </section>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">校园与账号分配</h2>
            <p className="mt-1 text-sm text-muted">共 {visibleAccounts.length} 条分配</p>
          </div>
          {manager ? (
            <select
              className="form-input max-w-52"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
            >
              <option value="全部">全部负责人</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{personName(member)}</option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
          {visibleAccounts.map((account) => (
            <article key={account.id} className="bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-ink">{account.schools?.name ?? "未命名学校"}</p>
                  <p className="mt-1 text-sm text-muted">{account.schools?.city ?? "-"} · {personName(account.profiles)}</p>
                </div>
                <span className={`badge ${account.status === "启用" ? "bg-brand-100 text-brand-800" : "bg-coral-50 text-coral-700"}`}>
                  {account.status}
                </span>
              </div>
              <div className="mt-5 flex items-center gap-2">
                <PlatformBadge platform={account.platform} />
                <span className="text-sm font-medium text-ink">{account.account_name}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-light">账号定位</dt>
                  <dd className="mt-1 font-medium text-ink">{account.account_positioning}</dd>
                </div>
                <div>
                  <dt className="text-muted-light">每日目标</dt>
                  <dd className="mt-1 font-medium text-ink">{account.daily_publish_target} 条</dd>
                </div>
              </dl>
              {account.account_password ? (
                <button
                  className="mt-4 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
                  onClick={() => navigator.clipboard.writeText(account.account_password ?? "")}
                  type="button"
                >
                  复制账号密码
                </button>
              ) : null}
            </article>
          ))}
        </div>
        {!visibleAccounts.length ? (
          <div className="px-5 py-14 text-center text-sm text-muted">暂无校园分配。</div>
        ) : null}
      </section>
    </div>
  );
}
