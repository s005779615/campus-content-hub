import { BarChart3, MessageCircle, Send, TrendingUp, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MetricsPanel } from "@/components/metrics-panel";
import { PlatformBadge } from "@/components/platform-badge";
import { StatCard } from "@/components/stat-card";
import { requireAuth } from "@/lib/auth";
import { compactNumber, formatDateTime } from "@/lib/format";
import type { ContentRecord, PublicationRecord, SchoolRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { supabase, profile } = await requireAuth();

  const [{ data: contents }, { data: publications }, { data: schools }, { data: metrics }] = await Promise.all([
    supabase
      .from("content_records")
      .select("id,schools(name,campus_name),profiles(full_name,email)")
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<ContentRecord[]>(),
    supabase
      .from("publication_records")
      .select("id,views,platform,private_messages,wechat_adds,conversions,created_at,schools(name,campus_name),profiles(full_name,email),content_records(content_type,content_goal)")
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<PublicationRecord[]>(),
    supabase.from("schools").select("*").order("name").returns<SchoolRecord[]>(),
    supabase.from("publish_metrics").select("id,views,likes,favorites,comments,shares,platform,schools(name,campus_name),profiles!user_id(full_name,email)").order("created_at", { ascending: false }).limit(500),
  ]);

  const contentRows = (contents ?? []).filter(Boolean);
  const publicationRows = (publications ?? []).filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metricRows: any[] = metrics ?? [];

  // Stats
  const pubViews = publicationRows.reduce((s, i) => s + (i.views || 0), 0);
  const metViews = metricRows.reduce((s, i) => s + (i.views || 0), 0);
  const totalViews = pubViews + metViews;
  const totalPM = publicationRows.reduce((s, i) => s + (i.private_messages || 0), 0);
  const totalWechat = publicationRows.reduce((s, i) => s + (i.wechat_adds || 0), 0);
  const totalConv = publicationRows.reduce((s, i) => s + (i.conversions || 0), 0);
  const totalContent = contentRows.length + metricRows.length;

  // School aggregation
  const schoolStats: Record<string, { content: number; views: number; pm: number; wc: number; cv: number; likes: number }> = {};
  for (const c of contentRows) {
    const k = c.schools?.name || "未命名";
    schoolStats[k] = schoolStats[k] || { content: 0, views: 0, pm: 0, wc: 0, cv: 0, likes: 0 };
    schoolStats[k].content += 1;
  }
  for (const m of metricRows) {
    const k = m.schools?.name || "未命名";
    schoolStats[k] = schoolStats[k] || { content: 0, views: 0, pm: 0, wc: 0, cv: 0, likes: 0 };
    schoolStats[k].content += 1;
    schoolStats[k].views += m.views || 0;
    schoolStats[k].likes += m.likes || 0;
  }
  for (const p of publicationRows) {
    const k = p.schools?.name || "未命名";
    schoolStats[k] = schoolStats[k] || { content: 0, views: 0, pm: 0, wc: 0, cv: 0, likes: 0 };
    schoolStats[k].views += p.views || 0;
    schoolStats[k].pm += p.private_messages || 0;
    schoolStats[k].wc += p.wechat_adds || 0;
    schoolStats[k].cv += p.conversions || 0;
  }
  const schoolList = Object.entries(schoolStats).sort((a, b) => b[1].views - a[1].views);

  // Member aggregation
  const memberStats: Record<string, number> = {};
  for (const p of publicationRows) {
    const k = p.profiles?.full_name || (p.profiles?.email || "").replace(/^u_|@campus\.local$/g, "") || "未命名";
    memberStats[k] = (memberStats[k] || 0) + 1;
  }
  for (const m of metricRows) {
    const k = m.profiles?.full_name || (m.profiles?.email || "").replace(/^u_|@campus\.local$/g, "") || "未命名";
    memberStats[k] = (memberStats[k] || 0) + 1;
  }
  const memberList = Object.entries(memberStats).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Platform aggregation
  const platformStats: Record<string, number> = {};
  for (const p of publicationRows) { platformStats[p.platform] = (platformStats[p.platform] || 0) + (p.views || 0); }
  for (const m of metricRows) { platformStats[m.platform] = (platformStats[m.platform] || 0) + (m.views || 0); }
  const platformList = Object.entries(platformStats).sort((a, b) => b[1] - a[1]);

  // Top publications
  const topPubs = [...publicationRows].sort((a, b) => (b.private_messages || 0) - (a.private_messages || 0)).slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);
  const dailyLeads = publicationRows.filter(p => p.created_at?.slice(0, 10) === today).reduce((s, p) => s + (p.private_messages || 0) + (p.wechat_adds || 0), 0);

  return (
    <>
      <PageHeader title="数据看板" description="实时汇总全平台内容、播放、互动和转化数据" />

      {/* Top cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="内容数量" value={totalContent} icon={BarChart3} />
        <StatCard title="播放量" value={compactNumber(totalViews)} icon={Send} />
        <StatCard title="私信人数" value={totalPM} icon={MessageCircle} />
        <StatCard title="加微信人数" value={totalWechat} icon={UsersRound} />
        <StatCard title="成交人数" value={totalConv} icon={TrendingUp} helper={`今日新增线索 ${dailyLeads}`} />
      </div>

      {/* Rankings */}
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="panel overflow-hidden">
          <div className="border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5"><h2 className="text-sm font-bold text-ink">学校排行</h2></div>
          <div className="divide-y divide-line/50">
            {schoolList.length ? schoolList.map(([name, s]) => (
              <div key={name} className="flex items-center justify-between px-5 py-3 hover:bg-canvas-alt/30">
                <div className="min-w-0 truncate text-[13px] font-medium">{name}</div>
                <div className="flex items-center gap-3 text-[12px] text-muted shrink-0">
                  <span>{s.content} 条</span>
                  <span>{compactNumber(s.views)} 播放</span>
                  <span>{s.pm} 私信</span>
                  {s.cv > 0 ? <span className="text-brand-600 font-semibold">{s.cv} 成交</span> : null}
                </div>
              </div>
            )) : <div className="px-5 py-8 text-center text-[13px] text-muted-light">暂无数据</div>}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5"><h2 className="text-sm font-bold text-ink">成员排行</h2></div>
          <div className="divide-y divide-line/50">
            {memberList.length ? memberList.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between px-5 py-3 hover:bg-canvas-alt/30">
                <span className="text-[13px] font-medium truncate">{name}</span>
                <span className="text-[13px] font-bold text-brand-700 shrink-0">{count} 条</span>
              </div>
            )) : <div className="px-5 py-8 text-center text-[13px] text-muted-light">暂无数据</div>}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5"><h2 className="text-sm font-bold text-ink">平台分布</h2></div>
          <div className="divide-y divide-line/50">
            {platformList.length ? platformList.map(([name, v]) => (
              <div key={name} className="flex items-center justify-between px-5 py-3 hover:bg-canvas-alt/30">
                <PlatformBadge platform={name} />
                <span className="text-[13px] font-bold text-brand-700">{compactNumber(v)} 播放</span>
              </div>
            )) : <div className="px-5 py-8 text-center text-[13px] text-muted-light">暂无数据</div>}
          </div>
        </section>
      </div>

      {/* Publish metrics table + Top publications */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="panel overflow-hidden">
          <div className="border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5"><h2 className="text-sm font-bold text-ink">最近发布</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead><tr className="border-b border-line/50 bg-canvas-alt/40">
                <th className="px-5 py-3 text-[11px] font-semibold uppercase text-muted-light">内容</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase text-muted-light">学校</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase text-muted-light">平台</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase text-muted-light">私信</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase text-muted-light">加微信</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase text-muted-light">时间</th>
              </tr></thead>
              <tbody className="divide-y divide-line/50">
                {topPubs.length ? topPubs.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas-alt/30">
                    <td className="px-5 py-3 text-[13px] font-medium">{item.content_records?.content_type || "-"}</td>
                    <td className="px-5 py-3 text-[13px] text-ink-soft">{item.schools?.name || "-"}</td>
                    <td className="px-5 py-3"><PlatformBadge platform={item.platform} /></td>
                    <td className="px-5 py-3 text-[13px] font-semibold">{item.private_messages || 0}</td>
                    <td className="px-5 py-3 text-[13px]">{item.wechat_adds || 0}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-light">{formatDateTime(item.created_at)}</td>
                  </tr>
                )) : <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-muted-light">暂无发布记录</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      <MetricsPanel schools={schools ?? []} />
    </>
  );
}
