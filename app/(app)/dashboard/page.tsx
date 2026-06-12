import {
  BarChart3,
  CheckCircle2,
  FileText,
  MessageCircle,
  School,
  TrendingUp,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { PlatformBadge } from "@/components/platform-badge";
import { StatCard } from "@/components/stat-card";
import { homeTips } from "@/lib/constants";
import { compactNumber, formatDateTime, formatDate } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import type { ContentRecord, PublicationRecord, SchoolRecord, TaskRecord } from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, profile } = await requireAuth();

  const today = new Date().toISOString().slice(0, 10);
  const greeting =
    new Date().getHours() < 12 ? "上午好" : new Date().getHours() < 18 ? "下午好" : "晚上好";

  const [
    { data: schools },
    { data: contents },
    { data: publications },
    { data: tasks },
    { data: members },
    { data: recentPubs },
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
      : Promise.resolve({ data: [] }),
    supabase
      .from("publication_records")
      .select("*,schools(name,campus_name),profiles(full_name,email),content_records(content_type,content_goal)")
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<PublicationRecord[]>(),
  ]);

  const schoolRows: SchoolRecord[] = schools ?? [];
  const contentRows: ContentRecord[] = contents ?? [];
  const publicationRows: PublicationRecord[] = publications ?? [];
  const taskRows: TaskRecord[] = tasks ?? [];
  const memberRows = members ?? [];
  const recentPubsRows: PublicationRecord[] = recentPubs ?? [];

  const totalPrivateMessages = publicationRows.reduce(
    (sum, item) => sum + item.private_messages,
    0
  );
  const totalViews = publicationRows.reduce((sum, item) => sum + item.views, 0);
  const totalWechat = publicationRows.reduce((sum, item) => sum + item.wechat_adds, 0);
  const doneTasks = taskRows.filter((task) => task.is_done).length;
  const pendingTasks = taskRows.length - doneTasks;

  return (
    <>
      <div className="mb-7 flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">
            {greeting}，{profile.full_name || profile.email}
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-heading text-ink sm:text-[34px]">
            {profile.role === "admin" ? "团队内容运营中台" : "校园内容工作台"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {profile.role === "admin"
              ? `${schoolRows.length} 所学校 · ${memberRows.length} 名队员 · ${contentRows.length} 条最近内容`
              : `${schoolRows.length} 所负责学校 · ${taskRows.length} 个今日任务`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/generate" className="button-primary">
            <WandSparkles size={16} strokeWidth={1.8} />
            生成内容
          </Link>
          {profile.role === "admin" ? (
            <Link href="/analytics" className="button-secondary">
              <BarChart3 size={16} strokeWidth={1.8} />
              数据看板
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid overflow-hidden rounded-lg border border-line bg-line gap-px sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="可见学校" value={schoolRows.length} icon={School} />
        <StatCard title="内容总数" value={contentRows.length} icon={FileText} />
        <StatCard
          title="累计私信"
          value={compactNumber(totalPrivateMessages)}
          helper={`${totalWechat} 人加微信`}
          icon={MessageCircle}
        />
        {profile.role === "admin" ? (
          <StatCard title="队员数量" value={memberRows.length} icon={UsersRound} />
        ) : (
          <StatCard
            title="今日任务"
            value={`${doneTasks}/${taskRows.length}`}
            helper={pendingTasks > 0 ? `${pendingTasks} 个待完成` : "全部完成"}
            icon={CheckCircle2}
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-ink">最近生成内容</h2>
              <p className="mt-1 text-xs text-muted-light">团队最近保存的内容记录</p>
            </div>
            <Link href="/library" className="text-xs font-medium text-ink underline-offset-4 hover:underline">
              查看全部
            </Link>
          </div>
          <div className="divide-y divide-line">
            {contentRows.length ? (
              contentRows.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-canvas-alt/50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <PlatformBadge platform={item.platform} />
                      <p className="truncate text-sm font-medium text-ink">
                        {item.content_type}
                      </p>
                      <span className="text-xs text-muted">
                        {item.schools?.name ?? "未命名学校"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-muted-light">
                      {item.content_goal} · {item.tone} · {formatDateTime(item.created_at)}
                      {item.profiles ? ` · ${item.profiles.full_name || item.profiles.email}` : ""}
                    </p>
                  </div>
                  <Link className="text-xs font-medium text-muted hover:text-ink" href="/library">
                    查看内容
                  </Link>
                </div>
              ))
            ) : (
              <div className="px-5 py-12 text-center text-sm text-muted-light">
                还没有生成记录，先去生成一条内容。
              </div>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-ink">今日任务</h2>
                <p className="mt-1 text-xs text-muted-light">
                  {doneTasks}/{taskRows.length} 已完成
                </p>
              </div>
              <Link href="/tasks" className="text-xs font-medium text-ink underline-offset-4 hover:underline">
                全部任务
              </Link>
            </div>
            <div className="divide-y divide-line">
              {taskRows.length ? (
                taskRows.map((task) => (
                  <div key={task.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          task.is_done ? "bg-brand-800" : "border border-brand-400 bg-white"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold text-ink">
                              {task.schools?.name ?? "不限学校"}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              {profile.role === "admin"
                                ? task.profiles?.full_name || task.profiles?.email
                                : task.note || "完成后到任务页勾选"}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-medium tabular-nums text-muted">
                            {task.is_done ? "已完成" : `${task.completed_count}/${task.required_count}`}
                          </span>
                        </div>
                        {!task.is_done ? (
                          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-canvas-alt">
                            <div
                              className="h-full rounded-full bg-brand-700 transition-all"
                              style={{
                                width: `${Math.round((task.completed_count / task.required_count) * 100)}%`,
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-muted-light">
                  今天暂无任务。
                </div>
              )}
            </div>
          </section>

          {recentPubsRows.length > 0 ? (
            <section className="panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-ink">最近发布</h2>
                  <p className="mt-1 text-xs text-muted-light">发布后的最新数据变化</p>
                </div>
                <TrendingUp size={17} strokeWidth={1.7} className="text-muted-light" />
              </div>
              <div className="divide-y divide-line">
                {recentPubsRows.map((pub) => (
                  <div key={pub.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {pub.schools?.name ?? "-"} · {pub.content_records?.content_type ?? "-"}
                      </p>
                      <p className="mt-1 text-xs text-muted-light">
                        {pub.profiles?.full_name || pub.profiles?.email || "-"} · {formatDate(pub.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">
                      {pub.private_messages + pub.wechat_adds > 0
                        ? `+${pub.private_messages + pub.wechat_adds} 线索`
                        : `${pub.views} 播放`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid overflow-hidden rounded-lg border border-line bg-white md:grid-cols-2 md:divide-x md:divide-line">
        {homeTips.map((tip) => {
          const Icon = tip.icon;

          return (
            <div key={tip.title} className="flex gap-4 border-b border-line p-5 last:border-b-0 md:border-b-0 sm:p-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-light">
                <Icon size={19} strokeWidth={1.7} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">{tip.title}</h3>
                <p className="mt-1 text-[13px] leading-6 text-muted">{tip.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
