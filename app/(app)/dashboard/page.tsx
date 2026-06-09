import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  MessageCircle,
  School,
  Sparkles,
  TrendingUp,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
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
      {/* ── 欢迎区 ── */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-6 text-white shadow-elevated sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-100">
              {greeting}，{profile.full_name || profile.email}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-[28px]">
              {profile.role === "admin" ? "团队内容运营中台" : "校园内容工作台"}
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-brand-100/90">
              {profile.role === "admin"
                ? `${schoolRows.length} 所学校 · ${memberRows.length} 名队员 · ${contentRows.length} 条内容`
                : `${schoolRows.length} 所负责学校 · ${taskRows.length} 个今日任务`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/generate"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/25 active:scale-[0.98]"
            >
              <WandSparkles size={17} />
              生成内容
            </Link>
            {profile.role === "admin" ? (
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-medium text-white/90 backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.98]"
              >
                <BarChart3 size={17} />
                数据看板
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── 统计卡片 ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        {/* ── 最近内容 ── */}
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-brand-500" />
              <h2 className="text-sm font-bold text-ink">最近生成内容</h2>
            </div>
            <Link href="/library" className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
              查看全部
            </Link>
          </div>
          <div className="divide-y divide-line/50">
            {contentRows.length ? (
              contentRows.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-canvas-alt/30"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <PlatformBadge platform={item.platform} />
                      <p className="truncate text-[13px] font-semibold text-ink">
                        {item.content_type}
                      </p>
                      <span className="text-[11px] text-muted-light">
                        {item.schools?.name ?? "未命名学校"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-light">
                      {item.content_goal} · {item.tone} · {formatDateTime(item.created_at)}
                      {item.profiles ? ` · ${item.profiles.full_name || item.profiles.email}` : ""}
                    </p>
                  </div>
                  <Link className="button-secondary text-xs !px-3 !py-1.5 shrink-0" href="/library">
                    查看
                  </Link>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-[13px] text-muted-light">
                还没有生成记录，先去生成一条内容。
              </div>
            )}
          </div>
        </section>

        {/* ── 今日任务 + 最近发布 ── */}
        <div className="space-y-5">
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-brand-500" />
                <h2 className="text-sm font-bold text-ink">今日任务</h2>
              </div>
              <Link href="/tasks" className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                全部任务
              </Link>
            </div>
            <div className="divide-y divide-line/50">
              {taskRows.length ? (
                taskRows.map((task) => (
                  <div key={task.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink">
                          {task.schools?.name ?? "不限学校"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-light">
                          {profile.role === "admin"
                            ? task.profiles?.full_name || task.profiles?.email
                            : task.note || "完成后到任务页勾选"}
                        </p>
                      </div>
                      <span
                        className={`badge shrink-0 ${
                          task.is_done
                            ? "bg-brand-50 text-brand-700"
                            : "bg-coral-50 text-coral-600"
                        }`}
                      >
                        {task.is_done ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <Clock size={11} />
                        )}
                        {task.is_done
                          ? "已完成"
                          : `${task.completed_count}/${task.required_count}`}
                      </span>
                    </div>
                    {!task.is_done ? (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-canvas-alt">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all"
                          style={{
                            width: `${Math.round((task.completed_count / task.required_count) * 100)}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-[13px] text-muted-light">
                  今天暂无任务。
                </div>
              )}
            </div>
          </section>

          {/* 最近发布动态 */}
          {recentPubsRows.length > 0 ? (
            <section className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
                <TrendingUp size={16} className="text-brand-500" />
                <h2 className="text-sm font-bold text-ink">最近发布</h2>
              </div>
              <div className="divide-y divide-line/50">
                {recentPubsRows.map((pub) => (
                  <div key={pub.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink truncate">
                          {pub.schools?.name ?? "-"} · {pub.content_records?.content_type ?? "-"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-light">
                          {pub.profiles?.full_name || pub.profiles?.email || "-"} · {formatDate(pub.created_at)}
                        </p>
                      </div>
                      <span className="text-[13px] font-bold text-brand-600 shrink-0">
                        {pub.private_messages + pub.wechat_adds > 0
                          ? `+${pub.private_messages + pub.wechat_adds} 线索`
                          : `${pub.views} 播放`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {/* ── 底部提示卡片 ── */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {homeTips.map((tip) => {
          const Icon = tip.icon;

          return (
            <div key={tip.title} className="panel p-5 transition-all hover:-translate-y-0.5">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">{tip.title}</h3>
                  <p className="mt-1 text-[13px] leading-6 text-muted">{tip.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
