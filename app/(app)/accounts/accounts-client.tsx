"use client";

import { useRouter } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import { accountPositionings, accountStatuses, platforms } from "@/lib/constants";
import { roleLabel } from "@/lib/roles";
import type {
  AccountPositioning,
  AccountStatus,
  Platform,
  PlatformAccount,
  Profile,
  SchoolRecord,
  UserRole
} from "@/lib/types";

type AccountFormState = {
  userId: string;
  schoolId: string;
  platform: Platform;
  accountName: string;
  platformAccountId: string;
  profileUrl: string;
  manualPositioning: AccountPositioning;
  dailyPublishTarget: string;
  status: AccountStatus;
  notes: string;
};

type BulkResult = {
  created: PlatformAccount[];
  failed: Array<{ rowNumber: number; accountName?: string; error: string }>;
};

const defaultFormState: AccountFormState = {
  userId: "",
  schoolId: "",
  platform: "抖音",
  accountName: "",
  platformAccountId: "",
  profileUrl: "",
  manualPositioning: "待AI定位",
  dailyPublishTarget: "1",
  status: "待定位",
  notes: ""
};

function personName(profile?: Pick<Profile, "full_name" | "email"> | Array<Pick<Profile, "full_name" | "email">> | null) {
  if (Array.isArray(profile)) return personName(profile[0]);
  if (!profile) return "未分配";
  return profile.full_name || profile.email.replace(/^u_|@campus\.local$/g, "");
}

function schoolName(school?: Pick<SchoolRecord, "name" | "campus_name" | "city"> | null) {
  if (!school) return "未命名学校";
  return [school.name, school.campus_name, school.city].filter(Boolean).join(" · ");
}

function accountAiPersona(account: PlatformAccount) {
  const profile = account.positioning_profile as { accountPersona?: string } | undefined;
  if (profile?.accountPersona) return profile.accountPersona;
  if (account.positioning_status === "已生成") return "待确认";
  if (account.positioning_status === "已确认") return "已确认";
  return "待AI定位";
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
  const manager = role === "admin" || role === "member";
  const [accounts, setAccounts] = useState(initialAccounts);
  const [form, setForm] = useState<AccountFormState>(defaultFormState);
  const [editingAccountId, setEditingAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingAccountId, setLoadingAccountId] = useState("");
  const [showBatch, setShowBatch] = useState(false);
  const [batchSchoolId, setBatchSchoolId] = useState("");
  const [batchUserId, setBatchUserId] = useState("");
  const [batchText, setBatchText] = useState("");
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchResult, setBatchResult] = useState<BulkResult | null>(null);
  const [filters, setFilters] = useState({
    owner: "全部",
    school: "全部",
    platform: "全部",
    status: "全部",
    positioning: "全部"
  });

  const metrics = useMemo(() => ({
    total: accounts.length,
    douyin: accounts.filter((account) => account.platform === "抖音").length,
    xiaohongshu: accounts.filter((account) => account.platform === "小红书").length,
    video: accounts.filter((account) => account.platform === "视频号").length
  }), [accounts]);

  const filteredAccounts = useMemo(() => accounts.filter((account) => {
    if (filters.owner !== "全部" && account.user_id !== filters.owner) return false;
    if (filters.school !== "全部" && account.school_id !== filters.school) return false;
    if (filters.platform !== "全部" && account.platform !== filters.platform) return false;
    if (filters.status !== "全部" && account.status !== filters.status) return false;
    if (filters.positioning !== "全部" && (account.positioning_status ?? "未确认") !== filters.positioning) {
      return false;
    }
    return true;
  }), [accounts, filters]);

  const grouped = useMemo(() => {
    const map = new Map<string, PlatformAccount[]>();
    for (const account of filteredAccounts) {
      const key = account.school_id;
      map.set(key, [...(map.get(key) ?? []), account]);
    }
    return Array.from(map.entries()).map(([schoolId, items]) => ({
      schoolId,
      school: items[0]?.schools,
      items,
      counts: {
        抖音: items.filter((item) => item.platform === "抖音").length,
        小红书: items.filter((item) => item.platform === "小红书").length,
        视频号: items.filter((item) => item.platform === "视频号").length
      } as Record<Platform, number>
    }));
  }, [filteredAccounts]);

  function updateForm<K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(defaultFormState);
    setEditingAccountId("");
  }

  async function refreshAccounts() {
    const response = await fetch("/api/accounts");
    const data = await response.json().catch(() => ({}));
    if (response.ok) setAccounts(data.accounts ?? []);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = toApiPayload(form);
    const response = await fetch(
      editingAccountId ? `/api/accounts/${editingAccountId}` : "/api/accounts",
      {
        method: editingAccountId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    setSaving(false);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "保存账号失败。");
      return;
    }

    const saved = data.account as PlatformAccount;
    setAccounts((current) =>
      editingAccountId
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]
    );
    setMessage(editingAccountId ? "账号修改已保存。" : "账号已添加。");
    resetForm();
    router.refresh();
  }

  function editAccount(account: PlatformAccount) {
    setEditingAccountId(account.id);
    setForm({
      userId: account.user_id,
      schoolId: account.school_id,
      platform: account.platform,
      accountName: account.account_name,
      platformAccountId: account.account_id ?? "",
      profileUrl: account.account_link ?? "",
      manualPositioning: account.account_positioning ?? "待AI定位",
      dailyPublishTarget: String(account.daily_publish_target ?? 1),
      status: account.status ?? "待定位",
      notes: account.notes ?? ""
    });
    setMessage(`正在编辑账号：${account.account_name}`);
  }

  async function deleteAccount(account: PlatformAccount) {
    const ok = window.confirm(
      `确定删除账号“${account.account_name}”吗？\n删除后，该账号将不再参与AI定位、运营诊断和任务分配。`
    );
    if (!ok) return;

    setLoadingAccountId(account.id);
    const response = await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setLoadingAccountId("");

    if (!response.ok) {
      setMessage(data.error ?? "删除失败。");
      return;
    }

    setAccounts((current) => current.filter((item) => item.id !== account.id));
    if (editingAccountId === account.id) resetForm();
    setMessage(`账号“${account.account_name}”已删除。`);
  }

  async function updateStatus(account: PlatformAccount, status: AccountStatus) {
    setLoadingAccountId(account.id);
    const response = await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const data = await response.json().catch(() => ({}));
    setLoadingAccountId("");

    if (!response.ok) {
      setMessage(data.error ?? "状态修改失败。");
      return;
    }

    setAccounts((current) =>
      current.map((item) => (item.id === account.id ? (data.account as PlatformAccount) : item))
    );
  }

  async function runAccountAiPositioning(account: PlatformAccount) {
    setLoadingAccountId(account.id);
    setMessage("");
    const response = await fetch("/api/operations/account-positioning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId: account.school_id, accountId: account.id, mode: "single" })
    });
    const data = await response.json().catch(() => ({}));
    setLoadingAccountId("");

    if (!response.ok) {
      setMessage(data.error ?? "AI定位失败。");
      return;
    }

    await refreshAccounts();
    setMessage(`账号“${account.account_name}”已生成AI定位。`);
  }

  async function submitBatch() {
    setBatchSaving(true);
    setBatchResult(null);
    setMessage("");

    const parsed = parseBatchRows(batchText, batchSchoolId, batchUserId, members);
    if (!parsed.accounts.length && !parsed.failed.length) {
      setBatchSaving(false);
      setBatchResult({ created: [], failed: [{ rowNumber: 1, error: "请先填写账号。" }] });
      return;
    }

    let result: BulkResult = { created: [], failed: parsed.failed };
    if (parsed.accounts.length) {
      const response = await fetch("/api/accounts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: parsed.accounts })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        result = {
          created: data.created ?? [],
          failed: [...parsed.failed, ...(data.failed ?? [])]
        };
      } else {
        result = {
          created: [],
          failed: [...parsed.failed, { rowNumber: 0, error: data.error ?? "批量保存失败。" }]
        };
      }
    }

    setBatchSaving(false);
    setBatchResult(result);
    if (result.created.length) {
      setAccounts((current) => [...result.created, ...current]);
      setBatchText("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="账号总数" value={metrics.total} />
        <MetricCard label="抖音" value={metrics.douyin} />
        <MetricCard label="小红书" value={metrics.xiaohongshu} />
        <MetricCard label="视频号" value={metrics.video} />
      </section>

      {manager ? (
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">
                {editingAccountId ? "编辑账号" : "添加账号"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                每个小红书、抖音、视频号账号都会保存为独立记录。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {editingAccountId ? (
                <button className="button-secondary" onClick={resetForm} type="button">
                  <RotateCcw size={16} />
                  取消编辑
                </button>
              ) : null}
              <button className="button-secondary" onClick={() => setShowBatch((value) => !value)} type="button">
                <Upload size={16} />
                批量添加账号
              </button>
            </div>
          </div>

          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
            <label>
              <span className="form-label">负责人</span>
              <select className="form-input" required value={form.userId} onChange={(event) => updateForm("userId", event.target.value)}>
                <option value="">选择成员</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {personName(member)} · {roleLabel(member.role)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">学校/校区</span>
              <select className="form-input" required value={form.schoolId} onChange={(event) => updateForm("schoolId", event.target.value)}>
                <option value="">选择学校</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}{school.campus_name ? ` · ${school.campus_name}` : ""} · {school.city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">平台</span>
              <select className="form-input" value={form.platform} onChange={(event) => updateForm("platform", event.target.value as Platform)}>
                {platforms.map((platform) => (
                  <option key={platform}>{platform}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">当前状态</span>
              <select className="form-input" value={form.status} onChange={(event) => updateForm("status", event.target.value as AccountStatus)}>
                {accountStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2">
              <span className="form-label">账号名称</span>
              <input className="form-input" required value={form.accountName} onChange={(event) => updateForm("accountName", event.target.value)} placeholder="例如：新疆大学新生攻略" />
            </label>
            <label>
              <span className="form-label">初步定位</span>
              <select className="form-input" value={form.manualPositioning} onChange={(event) => updateForm("manualPositioning", event.target.value as AccountPositioning)}>
                {accountPositionings.map((positioning) => (
                  <option key={positioning}>{positioning}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">每日发布目标</span>
              <input className="form-input" min="1" type="number" value={form.dailyPublishTarget} onChange={(event) => updateForm("dailyPublishTarget", event.target.value)} />
            </label>
            <label>
              <span className="form-label">账号 ID</span>
              <input className="form-input" value={form.platformAccountId} onChange={(event) => updateForm("platformAccountId", event.target.value)} placeholder="选填" />
            </label>
            <label className="md:col-span-2">
              <span className="form-label">账号链接</span>
              <input className="form-input" type="url" value={form.profileUrl} onChange={(event) => updateForm("profileUrl", event.target.value)} placeholder="https://..." />
            </label>
            <label className="md:col-span-2 xl:col-span-3">
              <span className="form-label">备注</span>
              <input className="form-input" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="账号素材、负责人要求或注意事项" />
            </label>
            <div className="flex items-end">
              <button className="button-primary w-full" disabled={saving} type="submit">
                {saving ? <Loader2 className="animate-spin" size={16} /> : editingAccountId ? <Save size={16} /> : <Plus size={16} />}
                {editingAccountId ? "保存修改" : "添加账号"}
              </button>
            </div>
          </form>

          {showBatch ? (
            <div className="mt-5 border border-line bg-canvas p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="form-label">默认学校/校区</span>
                  <select className="form-input" value={batchSchoolId} onChange={(event) => setBatchSchoolId(event.target.value)}>
                    <option value="">选择学校</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}{school.campus_name ? ` · ${school.campus_name}` : ""} · {school.city}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="form-label">默认负责人</span>
                  <select className="form-input" value={batchUserId} onChange={(event) => setBatchUserId(event.target.value)}>
                    <option value="">选择成员</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>{personName(member)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <textarea
                className="form-input mt-3 min-h-40"
                value={batchText}
                onChange={(event) => setBatchText(event.target.value)}
                placeholder={"抖音｜账号A｜账号ID｜账号链接｜负责人邮箱或姓名｜1｜待定位\n抖音｜账号B\n小红书｜账号C"}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button className="button-primary" disabled={batchSaving} onClick={submitBatch} type="button">
                  {batchSaving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  保存批量账号
                </button>
                {batchResult ? (
                  <span className="text-sm text-muted">
                    成功 {batchResult.created.length} 条，失败 {batchResult.failed.length} 条
                  </span>
                ) : null}
              </div>
              {batchResult?.failed.length ? (
                <div className="mt-3 space-y-1 text-sm text-coral-700">
                  {batchResult.failed.map((item, index) => (
                    <p key={`${item.rowNumber}-${index}`}>
                      第 {item.rowNumber || "-"} 行 {item.accountName ? `「${item.accountName}」` : ""}：{item.error}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
        </section>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">校园账号列表</h2>
              <p className="mt-1 text-sm text-muted">当前显示 {filteredAccounts.length} 个账号</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <FilterSelect label="负责人" value={filters.owner} onChange={(value) => setFilters((current) => ({ ...current, owner: value }))}>
                <option value="全部">全部负责人</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{personName(member)}</option>
                ))}
              </FilterSelect>
              <FilterSelect label="学校/校区" value={filters.school} onChange={(value) => setFilters((current) => ({ ...current, school: value }))}>
                <option value="全部">全部学校</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>{school.name}{school.campus_name ? ` · ${school.campus_name}` : ""}</option>
                ))}
              </FilterSelect>
              <FilterSelect label="平台" value={filters.platform} onChange={(value) => setFilters((current) => ({ ...current, platform: value }))}>
                <option value="全部">全部平台</option>
                {platforms.map((platform) => (
                  <option key={platform}>{platform}</option>
                ))}
              </FilterSelect>
              <FilterSelect label="状态" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
                <option value="全部">全部状态</option>
                {accountStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </FilterSelect>
              <FilterSelect label="定位状态" value={filters.positioning} onChange={(value) => setFilters((current) => ({ ...current, positioning: value }))}>
                <option value="全部">全部定位</option>
                <option value="未确认">未确认</option>
                <option value="已生成">已生成</option>
                <option value="已确认">已确认</option>
              </FilterSelect>
            </div>
          </div>
        </div>

        <div className="divide-y divide-line">
          {grouped.map((group) => (
            <div key={group.schoolId} className="bg-white">
              <div className="flex flex-col gap-2 bg-canvas px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">{schoolName(group.school)}</p>
                  <p className="mt-1 text-sm text-muted">
                    抖音（{group.counts.抖音}） · 小红书（{group.counts.小红书}） · 视频号（{group.counts.视频号}）
                  </p>
                </div>
                <span className="text-sm text-muted">共 {group.items.length} 个账号</span>
              </div>

              {platforms.map((platform) => {
                const platformItems = group.items.filter((account) => account.platform === platform);
                return (
                  <div key={platform} className="px-5 py-4">
                    <div className="mb-3 flex items-center gap-2">
                      <PlatformBadge platform={platform} />
                      <span className="text-sm font-semibold text-ink">{platform}（{platformItems.length}）</span>
                    </div>
                    {platformItems.length ? (
                      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                        {platformItems.map((account) => (
                          <article key={account.id} className="border border-line bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-base font-semibold text-ink">{account.account_name}</h3>
                                <p className="mt-1 text-sm text-muted">{personName(account.profiles)} · {account.account_id || "未填账号ID"}</p>
                              </div>
                              <span className={`badge ${account.status === "运营中" ? "bg-brand-100 text-brand-800" : "bg-canvas-alt text-ink-soft"}`}>
                                {account.status}
                              </span>
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                              <Info label="初步定位" value={account.account_positioning} />
                              <Info label="AI最终定位" value={accountAiPersona(account)} />
                              <Info label="每日目标" value={`${account.daily_publish_target} 条`} />
                              <Info label="定位状态" value={account.positioning_status ?? "未确认"} />
                            </dl>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button className="button-secondary text-xs" onClick={() => editAccount(account)} type="button">
                                <Pencil size={14} />
                                编辑
                              </button>
                              <button className="button-secondary text-xs" disabled={loadingAccountId === account.id} onClick={() => deleteAccount(account)} type="button">
                                {loadingAccountId === account.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                删除
                              </button>
                              <select
                                className="form-input h-9 max-w-28 py-1 text-xs"
                                value={account.status}
                                disabled={loadingAccountId === account.id}
                                onChange={(event) => updateStatus(account, event.target.value as AccountStatus)}
                              >
                                {accountStatuses.map((status) => (
                                  <option key={status}>{status}</option>
                                ))}
                              </select>
                              <button
                                className="button-primary text-xs"
                                disabled={loadingAccountId === account.id || account.status === "暂停" || account.status === "异常"}
                                onClick={() => runAccountAiPositioning(account)}
                                type="button"
                              >
                                {loadingAccountId === account.id ? <Loader2 className="animate-spin" size={14} /> : <Bot size={14} />}
                                AI定位
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">暂无{platform}账号。</p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {!filteredAccounts.length ? (
          <div className="px-5 py-14 text-center text-sm text-muted">暂无符合筛选条件的账号。</div>
        ) : null}
      </section>
    </div>
  );
}

function toApiPayload(form: AccountFormState) {
  return {
    userId: form.userId,
    schoolId: form.schoolId,
    platform: form.platform,
    accountName: form.accountName,
    platformAccountId: form.platformAccountId,
    profileUrl: form.profileUrl,
    manualPositioning: form.manualPositioning,
    dailyPublishTarget: Number(form.dailyPublishTarget || 1),
    status: form.status,
    notes: form.notes
  };
}

function parseBatchRows(
  text: string,
  defaultSchoolId: string,
  defaultUserId: string,
  members: Profile[]
) {
  const accounts: Array<ReturnType<typeof toApiPayload> & { rowNumber: number }> = [];
  const failed: BulkResult["failed"] = [];
  const memberLookup = new Map<string, Profile>();

  for (const member of members) {
    memberLookup.set(member.id, member);
    memberLookup.set(member.email, member);
    if (member.full_name) memberLookup.set(member.full_name, member);
  }

  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const rowNumber = index + 1;
      const [platformRaw, accountName, platformAccountId = "", profileUrl = "", ownerRaw = "", dailyTarget = "1", statusRaw = "待定位"] = line
        .split(/[|｜]/)
        .map((item) => item.trim());
      const owner = ownerRaw ? memberLookup.get(ownerRaw) : null;
      const userId = owner?.id || defaultUserId;
      const platform = platformRaw as Platform;
      const status = (accountStatuses as readonly string[]).includes(statusRaw) ? statusRaw as AccountStatus : "待定位";

      if (!(platforms as readonly string[]).includes(platform)) {
        failed.push({ rowNumber, accountName, error: "平台必须是小红书、抖音或视频号。" });
        return;
      }
      if (!accountName) {
        failed.push({ rowNumber, error: "账号名称不能为空。" });
        return;
      }
      if (!defaultSchoolId) {
        failed.push({ rowNumber, accountName, error: "请选择默认学校/校区。" });
        return;
      }
      if (!userId) {
        failed.push({ rowNumber, accountName, error: "请选择默认负责人或填写可匹配的负责人。" });
        return;
      }

      accounts.push({
        rowNumber,
        userId,
        schoolId: defaultSchoolId,
        platform,
        accountName,
        platformAccountId,
        profileUrl,
        manualPositioning: "待AI定位",
        dailyPublishTarget: Number(dailyTarget) || 1,
        status,
        notes: ""
      });
    });

  return { accounts, failed };
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="panel p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
    </article>
  );
}

function FilterSelect({
  children,
  label,
  value,
  onChange
}: {
  children: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="form-label">{label}</span>
      <select className="form-input min-w-32" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-muted-light">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value || "-"}</dd>
    </div>
  );
}
