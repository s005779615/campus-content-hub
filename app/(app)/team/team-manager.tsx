"use client";

import { useRouter } from "next/navigation";
import { Loader2, Save, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { Profile, SchoolRecord } from "@/lib/types";

export type AssignmentRow = {
  user_id: string;
  school_id: string;
  schools?: {
    name: string;
    campus_name: string | null;
  } | null;
};

export function TeamManager({
  members,
  schools,
  assignments
}: {
  members: Profile[];
  schools: SchoolRecord[];
  assignments: AssignmentRow[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<Record<string, string[]>>(() => {
    return members.reduce<Record<string, string[]>>((acc, member) => {
      acc[member.id] = assignments
        .filter((item) => item.user_id === member.id)
        .map((item) => item.school_id);
      return acc;
    }, {});
  });

  const assignedNames = useMemo(() => {
    return assignments.reduce<Record<string, string[]>>((acc, item) => {
      acc[item.user_id] = acc[item.user_id] ?? [];
      if (item.schools) {
        acc[item.user_id].push(
          [item.schools.name, item.schools.campus_name].filter(Boolean).join(" ")
        );
      }
      return acc;
    }, {});
  }, [assignments]);

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
        fullName: String(form.get("fullName") ?? "")
      })
    });

    setCreating(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "创建队员失败，请检查 Service Role Key。");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  function toggleSchool(memberId: string, schoolId: string) {
    setSelection((current) => {
      const selected = new Set(current[memberId] ?? []);

      if (selected.has(schoolId)) {
        selected.delete(schoolId);
      } else {
        selected.add(schoolId);
      }

      return {
        ...current,
        [memberId]: Array.from(selected)
      };
    });
  }

  async function saveSchools(memberId: string) {
    setSavingMemberId(memberId);
    setError("");

    const response = await fetch(`/api/team-members/${memberId}/schools`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolIds: selection[memberId] ?? [] })
    });

    setSavingMemberId(null);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "保存分配失败。");
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="panel p-5">
        <h2 className="text-sm font-bold text-ink">创建队员账号</h2>
        <p className="mt-0.5 text-xs text-muted-light">队员用账号名和密码登录。</p>
        <form className="mt-4 space-y-3.5" onSubmit={createMember}>
          <label className="block">
            <span className="form-label">队员姓名</span>
            <input className="form-input mt-1" name="fullName" placeholder="例如：小马" />
          </label>
          <label className="block">
            <span className="form-label">登录账号</span>
            <input className="form-input mt-1" name="username" required placeholder="英文+数字，如 xiaoma" />
          </label>
          <label className="block">
            <span className="form-label">初始密码</span>
            <input
              className="form-input mt-1"
              name="password"
              type="password"
              minLength={6}
              required
              placeholder="至少 6 位"
            />
          </label>
          {error ? (
            <div className="rounded-lg border border-coral-100 bg-coral-50/70 px-4 py-2.5 text-[13px] font-medium text-coral-600">
              {error}
            </div>
          ) : null}
          <button className="button-primary w-full" disabled={creating} type="submit">
            {creating ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
            创建队员
          </button>
        </form>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
          <h2 className="text-sm font-bold text-ink">学校分配</h2>
          <span className="text-[11px] text-muted-light">{members.length} 名队员</span>
        </div>
        <div className="divide-y divide-line/50">
          {members.length ? (
            members.map((member) => (
              <article key={member.id} className="px-5 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-ink">
                      {member.full_name || member.email}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-muted-light">{member.email}</p>
                    <p className="mt-2 text-[12px] text-muted">
                      已分配：
                      {assignedNames[member.id]?.length
                        ? assignedNames[member.id].join("、")
                        : "暂无"}
                    </p>
                  </div>
                  <button
                    className="button-secondary text-xs shrink-0"
                    onClick={() => saveSchools(member.id)}
                    disabled={savingMemberId === member.id}
                    type="button"
                  >
                    {savingMemberId === member.id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    保存分配
                  </button>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {schools.length ? (
                    schools.map((school) => {
                      const isSelected = (selection[member.id] ?? []).includes(school.id);
                      return (
                        <label
                          key={school.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-all duration-200 ${
                            isSelected
                              ? "border-brand-200 bg-brand-50/70 ring-1 ring-brand-100"
                              : "border-line/60 bg-white hover:border-brand-100 hover:bg-brand-50/30"
                          }`}
                        >
                          <input
                            className="mt-0.5 h-4 w-4 rounded accent-brand-600"
                            checked={isSelected}
                            onChange={() => toggleSchool(member.id, school.id)}
                            type="checkbox"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-ink">{school.name}</span>
                            <span className="text-[11px] text-muted-light">
                              {school.campus_name || "未填写校区"} · {school.city}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="col-span-full rounded-lg border border-line bg-canvas-alt px-4 py-3 text-[13px] text-muted-light">
                      还没有学校，先到学校管理页创建。
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="px-5 py-10 text-center text-[13px] text-muted-light">
              还没有队员账号。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
