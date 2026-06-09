"use client";

import { useRouter } from "next/navigation";
import { Edit3, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { SchoolInput, SchoolRecord, UserRole } from "@/lib/types";

const emptySchool: SchoolInput = {
  name: "",
  campus_name: "",
  city: "乌鲁木齐",
  dormitory_info: "",
  cafeteria_info: "",
  nearby_food: "",
  nearby_fun: "",
  registration_notes: "",
  essentials: "",
  campus_card_notes: "",
  bedding_scenarios: "",
  freshman_faq: "",
  banned_phrases: ""
};

const fieldGroups: Array<{
  title: string;
  fields: Array<{ name: keyof SchoolInput; label: string; required?: boolean; rows?: number }>;
}> = [
  {
    title: "基础信息",
    fields: [
      { name: "name", label: "学校名称", required: true },
      { name: "campus_name", label: "校区名称" },
      { name: "city", label: "学校所在城市", required: true }
    ]
  },
  {
    title: "校园生活资料",
    fields: [
      { name: "dormitory_info", label: "宿舍情况", rows: 3 },
      { name: "cafeteria_info", label: "食堂情况", rows: 3 },
      { name: "nearby_food", label: "周边美食", rows: 3 },
      { name: "nearby_fun", label: "周边娱乐", rows: 3 }
    ]
  },
  {
    title: "新生决策资料",
    fields: [
      { name: "registration_notes", label: "新生报到注意事项", rows: 3 },
      { name: "essentials", label: "开学必备用品", rows: 3 },
      { name: "campus_card_notes", label: "校园卡办理注意事项", rows: 3 },
      { name: "bedding_scenarios", label: "被子/床品需求场景", rows: 3 },
      { name: "freshman_faq", label: "常见新生问题", rows: 3 },
      { name: "banned_phrases", label: "禁止使用的话术", rows: 3 }
    ]
  }
];

export function SchoolManager({
  schools,
  role
}: {
  schools: SchoolRecord[];
  role: UserRole;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SchoolRecord | null>(null);
  const [draft, setDraft] = useState<SchoolInput>(emptySchool);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canEdit = role === "admin";
  const selectedTitle = useMemo(() => {
    if (!editing) {
      return "新增学校";
    }

    return `编辑：${editing.name}`;
  }, [editing]);

  function startCreate() {
    setEditing(null);
    setDraft(emptySchool);
    setError("");
  }

  function startEdit(school: SchoolRecord) {
    setEditing(school);
    setDraft({
      name: school.name,
      campus_name: school.campus_name ?? "",
      city: school.city,
      dormitory_info: school.dormitory_info ?? "",
      cafeteria_info: school.cafeteria_info ?? "",
      nearby_food: school.nearby_food ?? "",
      nearby_fun: school.nearby_fun ?? "",
      registration_notes: school.registration_notes ?? "",
      essentials: school.essentials ?? "",
      campus_card_notes: school.campus_card_notes ?? "",
      bedding_scenarios: school.bedding_scenarios ?? "",
      freshman_faq: school.freshman_faq ?? "",
      banned_phrases: school.banned_phrases ?? ""
    });
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch(editing ? `/api/schools/${editing.id}` : "/api/schools", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "保存失败，请稍后重试。");
      return;
    }

    startCreate();
    router.refresh();
  }

  async function deleteSchool(id: string) {
    if (!window.confirm("确定删除这所学校吗？相关分配和内容不会自动删除，请谨慎操作。")) {
      return;
    }

    const response = await fetch(`/api/schools/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "删除失败。");
      return;
    }

    if (editing?.id === id) {
      startCreate();
    }

    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
          <h2 className="text-sm font-bold text-ink">学校列表</h2>
          {canEdit ? (
            <button className="button-secondary text-xs" onClick={startCreate} type="button">
              <Plus size={15} />
              新增
            </button>
          ) : null}
        </div>
        <div className="divide-y divide-line/50">
          {schools.length ? (
            schools.map((school) => (
              <article
                key={school.id}
                className={`px-5 py-4 transition-colors hover:bg-canvas-alt/40 ${
                  editing?.id === school.id ? "bg-brand-50/50 ring-1 ring-inset ring-brand-100" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-ink">{school.name}</h3>
                    <p className="mt-1 text-[12px] text-muted-light">
                      {school.campus_name || "未填写校区"} · {school.city}
                    </p>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-muted">
                      {school.dormitory_info || school.registration_notes || "资料待补充"}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        className="button-ghost h-8 w-8 p-0"
                        onClick={() => startEdit(school)}
                        type="button"
                        aria-label="编辑学校"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        className="button-ghost h-8 w-8 p-0 text-muted-light hover:text-coral-600 hover:bg-coral-50"
                        onClick={() => deleteSchool(school.id)}
                        type="button"
                        aria-label="删除学校"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="px-5 py-10 text-center text-[13px] text-muted-light">
              还没有学校资料。
            </div>
          )}
        </div>
      </section>

      <section className="panel p-5">
        {canEdit ? (
          <form onSubmit={submit}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-ink">{selectedTitle}</h2>
              {editing ? (
                <button className="button-ghost text-xs" onClick={startCreate} type="button">
                  <X size={15} />
                  取消编辑
                </button>
              ) : null}
            </div>

            <div className="space-y-6">
              {fieldGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">
                    {group.title}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <label
                        key={field.name}
                        className={field.rows ? "block sm:col-span-2" : "block"}
                      >
                        <span className="form-label">{field.label}</span>
                        {field.rows ? (
                          <textarea
                            className="form-input mt-1 resize-y"
                            rows={field.rows}
                            value={draft[field.name] ?? ""}
                            required={field.required}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                [field.name]: event.target.value
                              }))
                            }
                          />
                        ) : (
                          <input
                            className="form-input mt-1"
                            value={draft[field.name] ?? ""}
                            required={field.required}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                [field.name]: event.target.value
                              }))
                            }
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-coral-100 bg-coral-50/70 px-4 py-2.5 text-[13px] font-medium text-coral-600">
                {error}
              </div>
            ) : null}

            <button className="button-primary mt-5 w-full sm:w-auto" disabled={loading} type="submit">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              保存学校资料
            </button>
          </form>
        ) : (
          <div>
            <h2 className="text-sm font-bold text-ink">资料说明</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              队员账号只能查看已分配学校。发现宿舍、食堂、报到或禁用话术有变化时，请联系管理员更新资料库。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
