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
        email: String(form.get("email") ?? ""),
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
      <section className="panel p-4">
        <h2 className="text-sm font-semibold text-ink">创建队员账号</h2>
        <form className="mt-4 space-y-3" onSubmit={createMember}>
          <label className="block">
            <span className="form-label">队员姓名</span>
            <input className="form-input mt-1" name="fullName" placeholder="例如：小马" />
          </label>
          <label className="block">
            <span className="form-label">登录邮箱</span>
            <input className="form-input mt-1" name="email" type="email" required />
          </label>
          <label className="block">
            <span className="form-label">初始密码</span>
            <input
              className="form-input mt-1"
              name="password"
              type="password"
              minLength={6}
              required
            />
          </label>
          {error ? (
            <div className="rounded-md border border-coral-500/30 bg-coral-50 px-3 py-2 text-sm text-coral-600">
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
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">学校分配</h2>
        </div>
        <div className="divide-y divide-line">
          {members.length ? (
            members.map((member) => (
              <article key={member.id} className="px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink">
                      {member.full_name || member.email}
                    </h3>
                    <p className="mt-1 text-xs text-muted">{member.email}</p>
                    <p className="mt-2 text-xs text-muted">
                      已分配：
                      {assignedNames[member.id]?.length
                        ? assignedNames[member.id].join("、")
                        : "暂无"}
                    </p>
                  </div>
                  <button
                    className="button-secondary shrink-0"
                    onClick={() => saveSchools(member.id)}
                    disabled={savingMemberId === member.id}
                    type="button"
                  >
                    {savingMemberId === member.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    保存分配
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {schools.length ? (
                    schools.map((school) => (
                      <label
                        key={school.id}
                        className="flex cursor-pointer items-start gap-2 rounded-md border border-line bg-canvas/60 p-3 text-sm transition hover:border-brand-100 hover:bg-brand-50"
                      >
                        <input
                          className="mt-1 h-4 w-4 accent-brand-600"
                          checked={(selection[member.id] ?? []).includes(school.id)}
                          onChange={() => toggleSchool(member.id, school.id)}
                          type="checkbox"
                        />
                        <span>
                          <span className="block font-medium text-ink">{school.name}</span>
                          <span className="text-xs text-muted">
                            {school.campus_name || "未填写校区"} · {school.city}
                          </span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="col-span-full rounded-md border border-line bg-canvas p-4 text-sm text-muted">
                      还没有学校，先到学校管理页创建。
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted">
              还没有队员账号。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
