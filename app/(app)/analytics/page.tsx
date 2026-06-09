import { BarChart3, MessageCircle, School, Send, TrendingUp, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PlatformBadge } from "@/components/platform-badge";
import { StatCard } from "@/components/stat-card";
import { requireAuth } from "@/lib/auth";
import { compactNumber, formatDateTime } from "@/lib/format";
import type { ContentRecord, PublicationRecord } from "@/lib/types";

export default async function AnalyticsPage() {
  const { supabase, profile } = await requireAuth();

  const [{ data: contents }, { data: publications }] = await Promise.all([
    supabase
      .from("content_records")
      .select("*,schools(name,campus_name,city),profiles(full_name,email)")
      .order("created_at", { ascending: false })
      .returns<ContentRecord[]>(),
    supabase
      .from("publication_records")
      .select("*,schools(name,campus_name),profiles(full_name,email),content_records(content_type,content_goal)")
      .order("created_at", { ascending: false })
      .returns<PublicationRecord[]>()
  ]);

  const contentRows: ContentRecord[] = contents ?? [];
  const publicationRows: PublicationRecord[] = publications ?? [];
  const totalViews = publicationRows.reduce((sum, item) => sum + item.views, 0);
  const totalPrivateMessages = publicationRows.reduce(
    (sum, item) => sum + item.private_messages,
    0
  );
  const totalWechatAdds = publicationRows.reduce((sum, item) => sum + item.wechat_adds, 0);
  const totalConversions = publicationRows.reduce((sum, item) => sum + item.conversions, 0);

  const bySchool = groupBy(publicationRows, (item) => item.schools?.name ?? "未命名学校");
  const byMember = groupBy(
    publicationRows,
    (item) => item.profiles?.full_name || item.profiles?.email || "未命名队员"
  );
  const byPlatform = groupBy(publicationRows, (item) => item.platform);
  const topPrivateMessages = [...publicationRows]
    .sort((a, b) => b.private_messages - a.private_messages)
    .slice(0, 8);
  const schoolConversionRows = Object.entries(bySchool)
    .map(([schoolName, rows]) => ({
      schoolName,
      privateMessages: rows.reduce((sum, item) => sum + item.private_messages, 0),
      wechatAdds: rows.reduce((sum, item) => sum + item.wechat_adds, 0),
      conversions: rows.reduce((sum, item) => sum + item.conversions, 0)
    }))
    .sort((a, b) => b.conversions - a.conversions);

  const today = new Date().toISOString().slice(0, 10);
  const dailyLeads = publicationRows
    .filter((item) => item.created_at?.slice(0, 10) === today)
    .reduce((sum, item) => sum + item.private_messages + item.wechat_adds, 0);

  return (
    <>
      <PageHeader
        title="数据看板"
        description={
          profile.role === "admin"
            ? "管理员可查看全团队发布、私信、加微信和成交表现。"
            : "查看自己发布内容带来的互动和线索表现。"
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="内容数量" value={contentRows.length} icon={BarChart3} />
        <StatCard title="播放量" value={compactNumber(totalViews)} icon={Send} />
        <StatCard title="私信人数" value={totalPrivateMessages} icon={MessageCircle} />
        <StatCard title="加微信人数" value={totalWechatAdds} icon={UsersRound} />
        <StatCard title="成交人数" value={totalConversions} icon={TrendingUp} helper={`今日新增线索 ${dailyLeads}`} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <RankingPanel title="学校内容数量">
          {Object.entries(groupBy(contentRows, (item) => item.schools?.name ?? "未命名学校")).map(
            ([name, rows]) => (
              <MetricRow key={name} label={name} value={`${rows.length} 条`} />
            )
          )}
        </RankingPanel>
        <RankingPanel title="队员发布数量">
          {Object.entries(byMember).map(([name, rows]) => (
            <MetricRow key={name} label={name} value={`${rows.length} 条`} />
          ))}
        </RankingPanel>
        <RankingPanel title="平台数据">
          {Object.entries(byPlatform).map(([name, rows]) => (
            <MetricRow
              key={name}
              label={<PlatformBadge platform={name} />}
              value={`${rows.reduce((sum, item) => sum + item.views, 0)} 播放`}
            />
          ))}
        </RankingPanel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
            <h2 className="text-sm font-bold text-ink">私信最多的内容</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line/50 bg-canvas-alt/40">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">内容</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">学校</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">平台</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">私信</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">加微信</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-light">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {topPrivateMessages.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-canvas-alt/30">
                    <td className="px-5 py-3 text-[13px] font-medium text-ink">{item.content_records?.content_type ?? "-"}</td>
                    <td className="px-5 py-3 text-[13px] text-ink-soft">{item.schools?.name ?? "-"}</td>
                    <td className="px-5 py-3"><PlatformBadge platform={item.platform} /></td>
                    <td className="px-5 py-3 text-[13px] font-semibold text-ink">{item.private_messages}</td>
                    <td className="px-5 py-3 text-[13px] text-ink-soft">{item.wechat_adds}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-light">{formatDateTime(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <School size={15} />
            </div>
            <h2 className="text-sm font-bold text-ink">学校转化表现</h2>
          </div>
          <div className="divide-y divide-line/50">
            {schoolConversionRows.length ? (
              schoolConversionRows.map((row) => (
                <div key={row.schoolName} className="px-5 py-4 transition-colors hover:bg-canvas-alt/30">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-ink">{row.schoolName}</p>
                    <span className="badge bg-brand-50 text-brand-700">{row.conversions} 成交</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[12px] text-muted-light">
                    <span>私信 {row.privateMessages}</span>
                    <span>加微信 {row.wechatAdds}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-[13px] text-muted-light">暂无发布回填数据。</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function groupBy<T>(rows: T[], getter: (row: T) => string) {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    const key = getter(row);
    acc[key] = acc[key] ?? [];
    acc[key].push(row);
    return acc;
  }, {});
}

function RankingPanel({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
      </div>
      <div className="divide-y divide-line/50">
        {children || <div className="px-5 py-10 text-center text-[13px] text-muted-light">暂无数据。</div>}
      </div>
    </section>
  );
}

function MetricRow({
  label,
  value
}: {
  label: React.ReactNode;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-canvas-alt/40">
      <div className="min-w-0 truncate text-[13px] font-medium text-ink-soft">{label}</div>
      <div className="shrink-0 text-[13px] font-bold text-brand-700">{value}</div>
    </div>
  );
}
