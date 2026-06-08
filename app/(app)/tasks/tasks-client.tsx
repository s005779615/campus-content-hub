"use client";

import { useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle2, Loader2, Save } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import type { Profile, SchoolRecord, TaskRecord, UserRole } from "@/lib/types";

export function TasksClient({
  tasks,
  schools,
  members,
  role
}: {
  tasks: TaskRecord[];
  schools: SchoolRecord[];
  members: Profile[];
  role: UserRole;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    date: "",
    schoolId: "全部",
    memberId: "全部"
  });
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    return localTasks.filter((task) => {
      const dateMatch = !filters.date || task.task_date === filters.date;
      const schoolMatch = filters.schoolId === "全部" || task.school_id === filters.schoolId;
      const memberMatch = filters.memberId === "全部" || task.user_id === filters.memberId;
      return dateMatch && schoolMatch && memberMatch;
    });
  }, [localTasks, filters]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: String(form.get("userId") ?? ""),
        schoolId: String(form.get("schoolId") ?? ""),
        taskDate: String(form.get("taskDate") ?? today),
        requiredCount: Number(form.get("requiredCount") ?? 1),
        note: String(form.get("note") ?? "")
      })
    });

    setCreating(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "创建任务失败。");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  function updateTaskLocal(id: string, patch: Partial<TaskRecord>) {
    setLocalTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task))
    );
  }

  async function saveTask(task: TaskRecord) {
    setSavingId(task.id);
    setMessage("");

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completedCount: task.completed_count,
        isDone: task.is_done
      })
    });

    setSavingId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "保存任务失败。");
      return;
    }

    setMessage("任务状态已保存。");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {role === "admin" ? (
        <section className="panel p-4">
          <h2 className="text-sm font-semibold text-ink">创建发布任务</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={createTask}>
            <label className="block xl:col-span-2">
              <span className="form-label">队员</span>
              <select className="form-input mt-1" name="userId" required>
                <option value="">选择队员</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block xl:col-span-2">
              <span className="form-label">学校</span>
              <select className="form-input mt-1" name="schoolId">
                <option value="">不限学校</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {[school.name, school.campus_name].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="form-label">日期</span>
              <input className="form-input mt-1" name="taskDate" type="date" defaultValue={today} required />
            </label>
            <label className="block">
              <span className="form-label">发布条数</span>
              <input className="form-input mt-1" name="requiredCount" type="number" min="1" defaultValue="1" required />
            </label>
            <label className="block md:col-span-2 xl:col-span-5">
              <span className="form-label">备注</span>
              <input className="form-input mt-1" name="note" placeholder="例如：优先发新生避坑和开学清单" />
            </label>
            <div className="flex items-end">
              <button className="button-primary w-full" disabled={creating} type="submit">
                {creating ? <Loader2 className="animate-spin" size={16} /> : <CalendarPlus size={16} />}
                创建
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="form-label">日期</span>
            <input
              className="form-input mt-1"
              type="date"
              value={filters.date}
              onChange={(event) =>
                setFilters((current) => ({ ...current, date: event.target.value }))
              }
            />
          </label>
          <label className="block">
            <span className="form-label">学校</span>
            <select
              className="form-input mt-1"
              value={filters.schoolId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, schoolId: event.target.value }))
              }
            >
              <option value="全部">全部学校</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          {role === "admin" ? (
            <label className="block">
              <span className="form-label">队员</span>
              <select
                className="form-input mt-1"
                value={filters.memberId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, memberId: event.target.value }))
                }
              >
                <option value="全部">全部队员</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </section>

      {message ? (
        <div className="rounded-md border border-line bg-white px-3 py-2 text-sm text-muted">
          {message}
        </div>
      ) : null}

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-canvas text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">队员</th>
                <th className="px-4 py-3 font-medium">学校</th>
                <th className="px-4 py-3 font-medium">要求</th>
                <th className="px-4 py-3 font-medium">完成数</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-3">{formatDate(task.task_date)}</td>
                  <td className="px-4 py-3">{task.profiles?.full_name || task.profiles?.email || "-"}</td>
                  <td className="px-4 py-3">{task.schools?.name || "不限学校"}</td>
                  <td className="px-4 py-3">{task.required_count} 条</td>
                  <td className="px-4 py-3">
                    <input
                      className="form-input w-24"
                      type="number"
                      min="0"
                      value={task.completed_count}
                      onChange={(event) =>
                        updateTaskLocal(task.id, {
                          completed_count: Number(event.target.value)
                        })
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        className="h-4 w-4 accent-brand-600"
                        checked={task.is_done}
                        onChange={(event) =>
                          updateTaskLocal(task.id, { is_done: event.target.checked })
                        }
                        type="checkbox"
                      />
                      {task.is_done ? "已完成" : "未完成"}
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="button-secondary"
                      disabled={savingId === task.id}
                      onClick={() => saveTask(task)}
                      type="button"
                    >
                      {savingId === task.id ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : task.is_done ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Save size={16} />
                      )}
                      保存
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? (
          <div className="px-4 py-8 text-center text-sm text-muted">当前筛选下暂无任务。</div>
        ) : null}
      </section>
    </div>
  );
}
