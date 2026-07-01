import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileUp,
  MessageCircle,
  School,
  Send,
  Sparkles,
  TrendingUp,
  UsersRound
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { PlatformBadge } from "@/components/platform-badge";
import { StatCard } from "@/components/stat-card";
import { compactNumber, formatDate } from "@/lib/format";
import { requireAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";
import type {
  PlatformAccount,
  Profile,
  PublicationRecord,
  SchoolRecord,
  TaskRecord
} from "@/lib/types";

function chinaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function weekStartIso(today: string) {
  const date = new Date(`${today}T00:00:00+08:00`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    weekday: "short"
  }).format(date);
  const dayIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);
  date.setUTCDate(date.getUTCDate() - Math.max(dayIndex, 0));
  return date.toISOString();
}

function personName(profile?: Pick<Profile, "full_name" | "email"> | null) {
  if (!profile) return "未分配";
  return profile.full_name || profile.email.replace(/^u_|@campus\.local$/g, "");
}

function leads(item: PublicationRecord) {
  return item.private_messages + item.wechat_adds + item.valid_inquiries;
}

export default async function DashboardPage() {
  const { supabase, profile } = await requireAuth();
  const today = chinaDate();
  const weekStart = weekStartIso(today);

  const [
    { data: schools },
    { data: tasks },
    { data: history },
    { data: publications },
    { data: members },
    { data: accounts }
  ] = await Promise.all([
    supabase.from("schools").select("*").order("name").returns<SchoolRecord[]>(),
    supabase
      .from("publish_tasks")
      .select(
        "*,schools(name,campus_name),profiles!user_id(full_name,email),platform_accounts(account_name,account_positioning,platform)"
      )
      .eq("task_date", today)
      .order("created_at", { ascending: false })
      .returns<TaskRecord[]>(),
    supabase
      .from("publish_tasks")
      .select(
        "*,schools(name,campus_name),profiles!user_id(full_name,email),platform_accounts(account_name,account_positioning,platform)"
      )
      .order("task_date", { ascending: false })
      .limit(8)
      .returns<TaskRecord[]>(),
    supabase
      .from("publication_records")
      .select(
        "*,schools(name,campus_name),profiles(full_name,email),content_records(content_type,content_goal)"
      )
      .gte("created_at", weekStart)
      .order("created_at", { ascending: false })
      .returns<PublicationRecord[]>(),
    profile.role === "admin"
      ? supabase
          .from("profiles")
          .select("id,email,full_name,role,created_at")
          .in("role", ["member", "agent"])
          .order("full_name")
          .returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] }),
    supabase
      .from("platform_accounts")
      .select("id,user_id,school_id,platform,account_name,account_id,account_link,account_positioning,daily_publish_target,status,notes,positioning_profile,positioning_status,positioning_generated_at,positioning_confirmed_at,deleted_at,created_at,updated_at,schools(name,campus_name,city),profiles!user_id(full_name,email,role)")
      .is("deleted_at", null)
      .not("status", "in", "(暂停,异常)")
      .order("account_name")
      .returns<PlatformAccount[]>()
  ]);

  const schoolRows = schools ?? [];
  const taskRows = tasks ?? [];
  const historyRows = history ?? [];
  const publicationRows = publications ?? [];
  const memberRows = members ?? [];
  const accountRows = accounts ?? [];

  if (profile.role === "admin") {
    const publishedStatuses = new Set(["已发布", "已回填", "已复盘"]);
    const finishedStatuses = new Set(["已回填", "已复盘"]);
    const todayRequired = taskRows.reduce((sum, task) => sum + task.required_count, 0);
    const todayPublished = taskRows.filter((task) => publishedStatuses.has(task.status)).length;
    const incomplete = taskRows.filter((task) => !finishedStatuses.has(task.status)).length;
    const weeklyConversions = publicationRows.reduce((sum, item) => sum + item.conversions, 0);
    const weeklyRevenue = publicationRows.reduce((sum, item) => sum + Number(item.revenue), 0);
    const bestContent = [...publicationRows].sort((a, b) => b.views - a.views)[0];

    const completion = memberRows.map((member) => {
      const own = taskRows.filter((task) => task.user_id === member.id);
      const done = own.filter((task) => finishedStatuses.has(task.status)).length;
      return {
        id: member.id,
        name: personName(member),
        done,
        total: own.length,
        rate: own.length ? Math.round((done / own.length) * 100) : 0
      };
    });

    const schoolLeads = Array.from(
      publicationRows.reduce((map, item) => {
        const name = item.schools?.name ?? "未命名学校";
        map.set(name, (map.get(name) ?? 0) + leads(item));
        return map;
      }, new Map<string, number>())
    ).sort((a, b) => b[1] - a[1]);

    const platformLeads = Array.from(
      publicationRows.reduce((map, item) => {
        map.set(item.platform, (map.get(item.platform) ?? 0) + leads(item));
        return map;
      }, new Map<string, number>())
    ).sort((a, b) => b[1] - a[1]);

    return (
      <>
        <Header
          eyebrow="管理员"
          title="团队监管仪表盘"
          description={`${memberRows.length} 名成员 · ${schoolRows.length} 所可见学校`}
        />

        <div className="grid overflow-hidden rounded-lg border border-line bg-line gap-px sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="今日应发内容" value={todayRequired} icon={ClipboardList} />
          <StatCard title="今日已发布" value={todayPublished} icon={Send} />
          <StatCard title="未完成任务" value={incomplete} icon={CheckCircle2} />
          <StatCard
            title="本周成交"
            value={weeklyConversions}
            helper={`成交额 ¥${weeklyRevenue.toLocaleString()}`}
            icon={CircleDollarSign}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">各成员今日完成率</h2>
              <UsersRound size={18} className="text-muted" />
            </div>
            <div className="mt-5 space-y-5">
              {completion.map((item) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{item.name}</span>
                    <span className="text-muted">{item.done}/{item.total} · {item.rate}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas-alt">
                    <div className="h-full rounded-full bg-brand-900" style={{ width: `${item.rate}%` }} />
                  </div>
                </div>
              ))}
              {!completion.length ? <p className="text-sm text-muted">还没有成员账号。</p> : null}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">本周最佳内容</h2>
              <TrendingUp size={18} className="text-muted" />
            </div>
            {bestContent ? (
              <div className="mt-5">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={bestContent.platform} />
                  <span className="text-sm text-muted">{bestContent.schools?.name}</span>
                </div>
                <p className="mt-4 text-xl font-semibold text-ink">
                  {bestContent.content_records?.content_type || "校园内容"}
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Metric label="播放" value={compactNumber(bestContent.views)} />
                  <Metric label="有效线索" value={leads(bestContent)} />
                  <Metric label="成交" value={bestContent.conversions} />
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted">本周还没有回填内容。</p>
            )}
          </section>

          <Ranking title="各学校线索数" rows={schoolLeads} icon={School} />
          <Ranking title="各平台线索数" rows={platformLeads} icon={BarChart3} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link className="button-primary" href="/tasks">分配今日任务</Link>
          <Link className="button-secondary" href="/accounts">管理校园分配</Link>
          <Link className="button-secondary" href="/analytics">查看完整数据</Link>
        </div>
      </>
    );
  }

  const publishedToday = taskRows.filter((task) =>
    ["已发布", "已回填", "已复盘"].includes(task.status)
  ).length;
  const ownLeads = publicationRows.reduce((sum, item) => sum + leads(item), 0);

  return (
    <>
      <Header
        eyebrow={roleLabel(profile.role)}
        title={`${personName(profile)}的工作台`}
        description={`${schoolRows.length} 所负责学校 · 今天 ${taskRows.length} 个任务`}
      />

      <div className="grid overflow-hidden rounded-lg border border-line bg-line gap-px sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="我负责的学校" value={schoolRows.length} icon={School} />
        <StatCard title="今日任务" value={taskRows.length} icon={ClipboardList} />
        <StatCard title="今日已发布" value={publishedToday} icon={Send} />
        <StatCard title="本周有效线索" value={ownLeads} icon={MessageCircle} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <QuickAction href="/generate" icon={Sparkles} title="生成内容" text="从学校资料开始创作" />
        <QuickAction href="/tasks?status=待发布" icon={FileUp} title="上传发布截图" text="完成发布后提交凭证" />
        <QuickAction href="/library" icon={TrendingUp} title="数据回填" text="填写播放、咨询和成交" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink">今日任务</h2>
              <p className="mt-1 text-sm text-muted">按状态继续下一步</p>
            </div>
            <Link className="text-sm font-medium text-ink hover:underline" href="/tasks">全部任务</Link>
          </div>
          <div className="divide-y divide-line">
            {taskRows.map((task) => (
              <Link
                key={task.id}
                href={task.status === "未开始" ? `/generate?taskId=${task.id}` : "/tasks"}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-canvas-alt"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink">{task.content_type}</p>
                  <p className="mt-1 truncate text-sm text-muted">
                    {task.schools?.name} · {task.platform_accounts?.account_name}
                  </p>
                </div>
                <span className="badge shrink-0 bg-canvas-alt text-muted">{task.status}</span>
              </Link>
            ))}
            {!taskRows.length ? <p className="px-5 py-12 text-center text-sm text-muted">今天暂无任务。</p> : null}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold text-ink">我的校园账号</h2>
            <Link className="button-secondary text-xs" href="/accounts">新增账号</Link>
          </div>
          <div className="divide-y divide-line">
            {accountRows.map((account) => (
              <div key={account.id} className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={account.platform} />
                  <span className="font-medium text-ink">{account.account_name}</span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {account.schools?.name} · 每日目标 {account.daily_publish_target} 条
                </p>
              </div>
            ))}
            {!accountRows.length ? <p className="px-5 py-10 text-center text-sm text-muted">暂无账号分配。</p> : null}
          </div>
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">历史任务记录</h2>
        </div>
        <div className="divide-y divide-line">
          {historyRows.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-ink">{task.content_type || "内容任务"}</p>
                <p className="mt-1 text-xs text-muted">{task.schools?.name} · {formatDate(task.task_date)}</p>
              </div>
              <span className="badge bg-canvas-alt text-muted">{task.status}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Header({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7 border-b border-line pb-7">
      <p className="text-sm font-medium text-muted">{eyebrow}</p>
      <h1 className="mt-2 text-[30px] font-semibold tracking-heading text-ink sm:text-[36px]">{title}</h1>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-canvas-alt p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

function Ranking({
  title,
  rows,
  icon: Icon
}: {
  title: string;
  rows: [string, number][];
  icon: typeof School;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <Icon size={18} className="text-muted" />
      </div>
      <div className="mt-4 divide-y divide-line">
        {rows.slice(0, 6).map(([name, value], index) => (
          <div key={name} className="flex items-center justify-between py-3 text-sm">
            <span className="text-ink">{index + 1}. {name}</span>
            <span className="font-semibold text-ink">{value}</span>
          </div>
        ))}
        {!rows.length ? <p className="py-6 text-sm text-muted">本周暂无线索数据。</p> : null}
      </div>
    </section>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  text
}: {
  href: Route;
  icon: typeof Sparkles;
  title: string;
  text: string;
}) {
  return (
    <Link className="panel flex items-center gap-4 p-5 transition-colors hover:bg-canvas-alt" href={href}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-900 text-white">
        <Icon size={18} />
      </span>
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-sm text-muted">{text}</span>
      </span>
    </Link>
  );
}
