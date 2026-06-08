import {
  BarChart3,
  CheckCircle2,
  FileText,
  MessageCircle,
  School,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { StatCard } from "@/components/stat-card";
import { homeTips } from "@/lib/constants";
import { compactNumber, formatDateTime } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import type { ContentRecord, PublicationRecord, SchoolRecord, TaskRecord } from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, profile } = await requireAuth();

  const today = new Date().toISOString().slice(0, 10);
  const [
    { data: schools },
    { data: contents },
    { data: publications },
    { data: tasks },
    { data: members }
  ] = await Promise.all([
    supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<SchoolRecord[]>(),
    supabase
      .from("content_records")
      .select("*,schools(name,campus_name,city),profiles(full_name,email)")
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<ContentRecord[]>(),
    supabase
      .from("publication_records")
      .select("*,schools(name,campus_name),profiles(full_name,email),content_records(content_type,content_goal)")
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<PublicationRecord[]>(),
    supabase
      .from("publish_tasks")
      .select("*,schools(name,campus_name),profiles(full_name,email)")
      .eq("task_date", today)
      .order("created_at", { ascending: false })
      .returns<TaskRecord[]>(),
    profile.role === "admin"
      ? supabase
          .from("profiles")
          .select("id,email,full_name,role")
          .eq("role", "member")
      : Promise.resolve({ data: [] })
  ]);

  const schoolRows: SchoolRecord[] = schools ?? [];
  const contentRows: ContentRecord[] = contents ?? [];
  const publicationRows: PublicationRecord[] = publications ?? [];
  const taskRows: TaskRecord[] = tasks ?? [];
  const memberRows = members ?? [];

  const totalPrivateMessages = publicationRows.reduce(
    (sum, item) => sum + item.private_messages,
    0
  );
  const doneTasks = taskRows.filter((task) => task.is_done).length;

  return (
    <>
      <PageHeader
        title={profile.role === "admin" ? "管理员首页" : "队员首页"}
        description={
          profile.role === "admin"
            ? "查看团队内容进展、今日任务和最新发布数据。"
            : "查看自己负责学校、今日任务，并快速进入内容生成。"
        }
        action={
          <Link href="/generate" className="button-primary">
            生成内容
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="可见学校" value={schoolRows.length} icon={School} />
        <StatCard title="最近内容" value={contentRows.length} icon={FileText} />
        <StatCard
          title="私信人数"
          value={compactNumber(totalPrivateMessages)}
          helper="按最近发布记录统计"
          icon={MessageCircle}
        />
        {profile.role === "admin" ? (
          <StatCard title="队员数量" value={memberRows.length} icon={UsersRound} />
        ) : (
          <StatCard
            title="今日任务"
            value={`${doneTasks}/${taskRows.length}`}
            helper="已完成/总任务"
            icon={CheckCircle2}
          />
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">最近生成内容</h2>
          </div>
          <div className="divide-y divide-line">
            {contentRows.length ? (
              contentRows.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlatformBadge platform={item.platform} />
                      <p className="truncate text-sm font-medium text-ink">
                        {item.content_type} · {item.schools?.name ?? "未命名学校"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {item.content_goal} / {item.tone} / {formatDateTime(item.created_at)}
                    </p>
                  </div>
                  <Link className="button-secondary shrink-0" href="/library">
                    查看
                  </Link>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted">
                还没有生成记录，先去生成一条内容。
              </div>
            )}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">今日任务</h2>
            <Link href="/tasks" className="text-xs font-medium text-brand-700">
              全部任务
            </Link>
          </div>
          <div className="divide-y divide-line">
            {taskRows.length ? (
              taskRows.map((task) => (
                <div key={task.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {task.schools?.name ?? "不限学校"} · {task.required_count} 条
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {profile.role === "admin"
                          ? task.profiles?.full_name || task.profiles?.email
                          : task.note || "完成后到任务页勾选"}
                      </p>
                    </div>
                    <span className="rounded-md bg-canvas px-2 py-1 text-xs text-muted">
                      {task.is_done ? "已完成" : `${task.completed_count}/${task.required_count}`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted">
                今天暂无任务。
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {homeTips.map((tip) => {
          const Icon = tip.icon;

          return (
            <div key={tip.title} className="panel p-4">
              <div className="flex gap-3">
                <div className="rounded-md bg-brand-50 p-2 text-brand-700">
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{tip.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{tip.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {profile.role === "admin" ? (
        <div className="mt-5">
          <Link href="/analytics" className="panel flex items-center justify-between p-4 transition hover:border-brand-100 hover:bg-brand-50">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-white p-2 text-brand-700">
                <BarChart3 size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">进入数据看板</p>
                <p className="mt-1 text-xs text-muted">查看学校、队员、平台和线索转化数据。</p>
              </div>
            </div>
            <span className="text-sm text-brand-700">查看</span>
          </Link>
        </div>
      ) : null}
    </>
  );
}
