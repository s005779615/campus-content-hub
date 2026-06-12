"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Upload
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import { contentTypes, taskStatuses } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type {
  PlatformAccount,
  Profile,
  SchoolRecord,
  TaskRecord,
  TaskStatus,
  UserRole
} from "@/lib/types";

const statusStyle: Record<TaskStatus, string> = {
  未开始: "bg-canvas-alt text-muted",
  已生成: "bg-brand-100 text-brand-800",
  待发布: "bg-skyline-50 text-skyline-600",
  已发布: "bg-brand-100 text-brand-800",
  已回填: "bg-brand-900 text-white",
  已复盘: "bg-ink text-white",
  异常: "bg-coral-50 text-coral-600"
};

function personName(profile?: Pick<Profile, "full_name" | "email"> | null) {
  if (!profile) return "未分配";
  return profile.full_name || profile.email.replace(/^u_|@campus\.local$/g, "");
}

export function TasksClient({
  tasks,
  schools,
  members,
  accounts,
  role,
  initialStatus
}: {
  tasks: TaskRecord[];
  schools: SchoolRecord[];
  members: Profile[];
  accounts: PlatformAccount[];
  role: UserRole;
  initialStatus?: string;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [filters, setFilters] = useState({
    date: "",
    schoolId: "全部",
    memberId: "全部",
    status: (taskStatuses as readonly string[]).includes(initialStatus ?? "")
      ? initialStatus ?? "全部"
      : "全部"
  });
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const filtered = useMemo(
    () =>
      localTasks.filter((task) => {
        return (
          (!filters.date || task.task_date === filters.date) &&
          (filters.schoolId === "全部" || task.school_id === filters.schoolId) &&
          (filters.memberId === "全部" || task.user_id === filters.memberId) &&
          (filters.status === "全部" || task.status === filters.status)
        );
      }),
    [filters, localTasks]
  );

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformAccountId: String(form.get("platformAccountId") ?? ""),
        taskDate: String(form.get("taskDate") ?? today),
        contentType: String(form.get("contentType") ?? ""),
        note: String(form.get("note") ?? "")
      })
    });

    const data = await response.json().catch(() => ({}));
    setCreating(false);

    if (!response.ok) {
      setMessage(data.error ?? "创建任务失败。");
      return;
    }

    setLocalTasks((current) => [data.task as TaskRecord, ...current]);
    setMessage("任务已分配。");
    event.currentTarget.reset();
    router.refresh();
  }

  async function updateTask(
    task: TaskRecord,
    patch: { status: TaskStatus; reviewNotes?: string }
  ) {
    setSavingId(task.id);
    setMessage("");
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const data = await response.json().catch(() => ({}));
    setSavingId(null);

    if (!response.ok) {
      setMessage(data.error ?? "更新任务失败。");
      return;
    }

    setLocalTasks((current) =>
      current.map((item) => (item.id === task.id ? (data.task as TaskRecord) : item))
    );
    setMessage("任务状态已更新。");
    router.refresh();
  }

  async function uploadScreenshot(task: TaskRecord, file: File) {
    setSavingId(task.id);
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`/api/tasks/${task.id}/screenshot`, {
      method: "POST",
      body: form
    });
    const data = await response.json().catch(() => ({}));
    setSavingId(null);

    if (!response.ok) {
      setMessage(data.error ?? "上传截图失败。");
      return;
    }

    setLocalTasks((current) =>
      current.map((item) => (item.id === task.id ? (data.task as TaskRecord) : item))
    );
    setMessage("发布截图已上传，任务进入已发布。");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {role === "admin" ? (
        <section className="panel p-5 sm:p-6">
          <h2 className="text-base font-semibold text-ink">分配每日任务</h2>
          <p className="mt-1 text-sm text-muted">选择运营账号后，负责人、学校和平台会自动关联。</p>
          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={createTask}>
            <label className="md:col-span-2">
              <span className="form-label">校区账号</span>
              <select className="form-input" name="platformAccountId" required>
                <option value="">选择账号</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {personName(account.profiles)} · {account.schools?.name} · {account.platform} · {account.account_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="form-label">内容类型</span>
              <select className="form-input" name="contentType" defaultValue={contentTypes[0]}>
                {contentTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">任务日期</span>
              <input className="form-input" name="taskDate" type="date" defaultValue={today} required />
            </label>
            <label className="md:col-span-2 xl:col-span-3">
              <span className="form-label">任务说明</span>
              <input className="form-input" name="note" placeholder="例如：突出新生报到和宿舍避坑" />
            </label>
            <div className="flex items-end">
              <button className="button-primary w-full" disabled={creating} type="submit">
                {creating ? <Loader2 className="animate-spin" size={16} /> : <CalendarPlus size={16} />}
                分配任务
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="form-label">日期</span>
            <input
              className="form-input"
              type="date"
              value={filters.date}
              onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
            />
          </label>
          <label>
            <span className="form-label">学校</span>
            <select
              className="form-input"
              value={filters.schoolId}
              onChange={(event) => setFilters((current) => ({ ...current, schoolId: event.target.value }))}
            >
              <option value="全部">全部学校</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </label>
          {role === "admin" ? (
            <label>
              <span className="form-label">校区负责人</span>
              <select
                className="form-input"
                value={filters.memberId}
                onChange={(event) => setFilters((current) => ({ ...current, memberId: event.target.value }))}
              >
                <option value="全部">全部负责人</option>
                {members.map((member) => <option key={member.id} value={member.id}>{personName(member)}</option>)}
              </select>
            </label>
          ) : null}
          <label>
            <span className="form-label">状态</span>
            <select
              className="form-input"
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="全部">全部状态</option>
              {taskStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </section>

      {message ? <p className="panel px-4 py-3 text-sm text-muted">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {filtered.map((task) => (
          <article key={task.id} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {task.platform ? <PlatformBadge platform={task.platform} /> : null}
                  <span className={`badge ${statusStyle[task.status]}`}>{task.status}</span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-ink">
                  {task.content_type || "内容任务"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {task.schools?.name || "未指定学校"} · {task.platform_accounts?.account_name || "未指定账号"}
                </p>
              </div>
              <time className="shrink-0 text-sm font-medium text-muted">{formatDate(task.task_date)}</time>
            </div>

            {role === "admin" ? (
              <p className="mt-4 text-sm text-ink-soft">负责人：{personName(task.profiles)}</p>
            ) : null}
            {task.note ? <p className="mt-3 rounded-lg bg-canvas-alt px-3 py-2 text-sm leading-6 text-muted">{task.note}</p> : null}
            {task.publish_screenshot_url ? (
              <a
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
                href={task.publish_screenshot_url}
                target="_blank"
                rel="noreferrer"
              >
                查看发布截图 <ExternalLink size={14} />
              </a>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              {task.status === "未开始" ? (
                <Link className="button-primary flex-1 sm:flex-none" href={`/generate?taskId=${task.id}`}>
                  开始生成
                </Link>
              ) : null}
              {task.status === "已生成" ? (
                <button
                  className="button-primary flex-1 sm:flex-none"
                  disabled={savingId === task.id}
                  onClick={() => updateTask(task, { status: "待发布" })}
                  type="button"
                >
                  {savingId === task.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  内容已确认
                </button>
              ) : null}
              {task.status === "待发布" ? (
                <label className="button-primary flex-1 cursor-pointer sm:flex-none">
                  {savingId === task.id ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  上传发布截图
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    disabled={savingId === task.id}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadScreenshot(task, file);
                    }}
                  />
                </label>
              ) : null}
              {task.status === "已发布" ? (
                <Link className="button-primary flex-1 sm:flex-none" href={`/library?taskId=${task.id}`}>
                  回填发布数据
                </Link>
              ) : null}
              {task.content_id ? (
                <Link className="button-secondary flex-1 sm:flex-none" href={`/library?taskId=${task.id}`}>
                  查看内容
                </Link>
              ) : null}
            </div>

            {role === "admin" ? (
              <form
                className="mt-5 border-t border-line pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void updateTask(task, {
                    status: String(form.get("status")) as TaskStatus,
                    reviewNotes: String(form.get("reviewNotes") ?? "")
                  });
                }}
              >
                <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
                  <select className="form-input" name="status" defaultValue={task.status}>
                    {taskStatuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <input
                    className="form-input"
                    name="reviewNotes"
                    defaultValue={task.review_notes ?? ""}
                    placeholder="复盘结论或异常说明"
                  />
                  <button className="button-secondary" disabled={savingId === task.id} type="submit">
                    保存
                  </button>
                </div>
              </form>
            ) : null}
          </article>
        ))}
      </section>

      {!filtered.length ? (
        <div className="empty-state text-sm text-muted">当前筛选下暂无任务。</div>
      ) : null}
    </div>
  );
}
