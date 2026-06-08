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
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">私信最多的内容</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-canvas text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">内容</th>
                  <th className="px-4 py-3 font-medium">学校</th>
                  <th className="px-4 py-3 font-medium">平台</th>
                  <th className="px-4 py-3 font-medium">私信</th>
                  <th className="px-4 py-3 font-medium">加微信</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {topPrivateMessages.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{item.content_records?.content_type ?? "-"}</td>
                    <td className="px-4 py-3">{item.schools?.name ?? "-"}</td>
                    <td className="px-4 py-3"><PlatformBadge platform={item.platform} /></td>
                    <td className="px-4 py-3 font-medium">{item.private_messages}</td>
                    <td className="px-4 py-3">{item.wechat_adds}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <School size={17} className="text-brand-700" />
            <h2 className="text-sm font-semibold text-ink">学校转化表现</h2>
          </div>
          <div className="divide-y divide-line">
            {schoolConversionRows.length ? (
              schoolConversionRows.map((row) => (
                <div key={row.schoolName} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-ink">{row.schoolName}</p>
                    <p className="text-sm font-semibold text-brand-700">{row.conversions} 成交</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    私信 {row.privateMessages} · 加微信 {row.wechatAdds}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted">暂无发布回填数据。</div>
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
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      <div className="divide-y divide-line">
        {children || <div className="px-4 py-8 text-center text-sm text-muted">暂无数据。</div>}
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
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 truncate text-sm text-ink">{label}</div>
      <div className="shrink-0 text-sm font-semibold text-brand-700">{value}</div>
    </div>
  );
}
