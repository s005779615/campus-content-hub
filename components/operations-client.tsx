"use client";

import { BarChart3, Brain, Calendar, ClipboardList, Download, Loader2, Plus, Target, TrendingUp, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import { compactNumber } from "@/lib/format";
import type { SchoolRecord } from "@/lib/types";

type PlanRecord = {
  id: string;
  school_id: string;
  school_level: string;
  investment_level: string;
  created_at: string;
  schools?: { name: string; campus_name: string | null };
};

type PlanData = {
  schoolLevel: string;
  investmentLevel: string;
  diagnosis: Array<{ issue: string; rootCause?: string; reason?: string; impact?: string; suggestion: string }>;
  stageAnalysis: {
    currentStage: string;
    stageGoal: string;
    timeWindow?: string;
    strategyBrief?: string;
    recommendedContent: string[];
    focusActions: string[];
  };
  growthStrategy?: {
    trafficStrategy: string;
    conversionStrategy: string;
    platformStrategy?: Record<string, string>;
    contentRotation?: string;
  };
  plan15Days: Array<{
    date: string;
    phase?: string;
    goal: string;
    contentDirection?: string;
    platformTasks?: Array<{ platform: string; title: string; direction: string }>;
    recommendedPlatform?: string;
    suggestedCount?: number;
    targetMetrics?: { 曝光: number; 私信: number; 进群: number };
    commentGuide?: string;
    dmScript?: string;
    personInCharge?: string;
    expectedExposure?: number;
  }>;
  teamTasks?: Record<string, string[]>;
  risks?: Array<{ risk: string; level: string; probability?: string; trigger: string; impact?: string; solution?: string; mitigation?: string }>;
  prediction?: { exposure: number; privateMessages: number; groups: number; orders: number; conversionRate: string };
};

const PLATFORMS = ["小红书", "抖音", "视频号"];
const BUSINESS_TYPES = [
  { key: "phoneCards", label: "电话卡" },
  { key: "bedding", label: "被子" },
  { key: "partTime", label: "兼职" },
  { key: "errands", label: "跑腿" },
  { key: "secondHand", label: "二手" },
];

const defaultSocialStats = PLATFORMS.map(p => ({
  platform: p,
  accountCount: 0,
  publishCount: 0,
  exposure: 0,
  likes: 0,
  favorites: 0,
  comments: 0,
  privateMessages: 0,
  groups: 0,
  deals: 0,
}));

export function OperationsClient({
  profile,
  schools,
  initialPlans,
  platformAccounts,
}: {
  profile: { role: string };
  schools: SchoolRecord[];
  initialPlans: PlanRecord[];
  platformAccounts: Array<{ id: string; school_id: string; user_id: string; platform: string; account_name: string }>;
}) {
  // Form state
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [schoolForm, setSchoolForm] = useState({ totalStudents: 0, newStudents: 0, maleRatio: 0.5, dormCount: 0, semesterStart: "", militaryStart: "", registerStart: "", campusName: "" });
  const [bizCheck, setBizCheck] = useState({ phoneCards: false, bedding: false, partTime: false, errands: false, secondHand: false });
  const [bizMeta, setBizMeta] = useState({ competitorCount: "", lastYearDeals: "", lastYearRate: "" });
  const [socialStats, setSocialStats] = useState(defaultSocialStats);

  // Result state
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"form" | "result" | "history">("form");
  const [plans, setPlans] = useState<PlanRecord[]>(initialPlans);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Task sync state
  const [syncDayIdx, setSyncDayIdx] = useState<number | null>(null);
  const [syncAccountId, setSyncAccountId] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function syncToTask(day: PlanData["plan15Days"][number]) {
    if (!selectedSchoolId || !syncAccountId) { setSyncMsg("请选择账号"); return; }
    setSyncing(true);
    setSyncMsg("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformAccountId: syncAccountId,
        taskDate: new Date().toISOString().slice(0, 10),
        contentType: (day.platformTasks?.[0]?.title || day.goal).slice(0, 30),
        note: `[运营计划] ${day.goal} · ${day.commentGuide}`,
      }),
    });
    if (res.ok) {
      setSyncMsg("✅ 任务已创建");
      setTimeout(() => { setSyncDayIdx(null); setSyncMsg(""); setSyncAccountId(""); }, 1200);
    } else {
      const d = await res.json().catch(() => ({}));
      setSyncMsg(d.error || "创建失败");
    }
    setSyncing(false);
  }

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  useEffect(() => {
    if (selectedSchool) {
      setSchoolForm(f => ({
        ...f,
        campusName: selectedSchool.campus_name || "",
      }));
    }
  }, [selectedSchoolId, selectedSchool]);

  const abortRef = useRef<AbortController | null>(null);

  async function cancelJob() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
    setMessage("已取消");
  }

  async function generatePlan() {
    if (!selectedSchoolId || !selectedSchool) return;
    setLoading(true);
    setMessage("AI 正在分阶段分析（校区评级+诊断+策略+15天计划）...");
    setPlan(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/operations/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          school: {
            name: selectedSchool.name,
            campusName: selectedSchool.campus_name || schoolForm.campusName,
            totalStudents: schoolForm.totalStudents,
            newStudents: schoolForm.newStudents,
            maleRatio: schoolForm.maleRatio,
            dormCount: schoolForm.dormCount,
            semesterStart: schoolForm.semesterStart,
            militaryStart: schoolForm.militaryStart || undefined,
            registerStart: schoolForm.registerStart || undefined,
          },
          businesses: {
            phoneCards: bizCheck.phoneCards,
            bedding: bizCheck.bedding,
            partTime: bizCheck.partTime,
            errands: bizCheck.errands,
            secondHand: bizCheck.secondHand,
            competitorCount: Number(bizMeta.competitorCount) || 0,
            lastYearDeals: Number(bizMeta.lastYearDeals) || 0,
            lastYearRate: bizMeta.lastYearRate || "0%",
          },
          socialStats: socialStats.filter(s => s.accountCount > 0 || s.publishCount > 0),
          schoolId: selectedSchoolId,
        }),
      });

      const d = await res.json();
      if (res.ok && d.plan) {
        setPlan(d.plan);
        setActiveTab("result");
        setMessage("");
        const hr = await fetch("/api/operations/plans");
        setPlans((await hr.json()).plans ?? []);
      } else {
        setMessage(d.error || "生成失败");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") setMessage("已取消");
      else setMessage("网络中断");
    }
    setLoading(false);
    abortRef.current = null;
  }

  async function loadPlan(id: string) {
    setLoading(true);
    const res = await fetch(`/api/operations/plans/${id}`);
    const d = await res.json();
    if (res.ok && d.plan) {
      setPlan(d.plan.plan_data);
      setSelectedPlanId(id);
      setActiveTab("result");
    }
    setLoading(false);
  }

  async function deletePlan(id: string) {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/operations/plans/${id}`, { method: "DELETE" });
    setPlans(p => p.filter(x => x.id !== id));
    if (selectedPlanId === id) {
      setPlan(null);
      setActiveTab("form");
    }
  }

  function updateSocialStat(idx: number, field: string, value: string) {
    setSocialStats(prev => prev.map((s, i) => i === idx ? { ...s, [field]: field === "platform" ? value : Number(value) || 0 } : s));
  }

  // ==================== RENDER ====================

  return (
    <div className="mt-5 space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-line/50 pb-0">
        {([
          ["form", "数据录入", ClipboardList],
          ["result", "AI 方案", Brain],
          ["history", "历史记录", Calendar],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${activeTab === key ? "border-brand-500 text-ink" : "border-transparent text-muted hover:text-ink-soft"}`}
            onClick={() => setActiveTab(key)}
            type="button"
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Form Tab */}
      {activeTab === "form" ? (
        <div className="grid gap-5 xl:grid-cols-3">
          {/* School info */}
          <section className="panel p-5 sm:p-6 space-y-4 xl:col-span-2">
            <div>
              <h2 className="text-sm font-bold text-ink">学校信息</h2>
              <p className="mt-0.5 text-xs text-muted-light">选择已录入的学校或补充校区数据</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="form-input" value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)}>
                <option value="">选择学校</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}{s.campus_name ? ` · ${s.campus_name}` : ""}</option>)}
              </select>
              <input className="form-input" placeholder="校区名称" value={schoolForm.campusName} onChange={e => setSchoolForm(f => ({ ...f, campusName: e.target.value }))} />
              <div className="flex gap-2">
                <input className="form-input" type="number" placeholder="学生总人数" value={schoolForm.totalStudents || ""} onChange={e => setSchoolForm(f => ({ ...f, totalStudents: Number(e.target.value) }))} />
                <input className="form-input" type="number" placeholder="新生人数" value={schoolForm.newStudents || ""} onChange={e => setSchoolForm(f => ({ ...f, newStudents: Number(e.target.value) }))} />
              </div>
              <div className="flex gap-2">
                <select className="form-input" value={schoolForm.maleRatio} onChange={e => setSchoolForm(f => ({ ...f, maleRatio: Number(e.target.value) }))}>
                  <option value={0.5}>男女 5:5</option>
                  <option value={0.4}>男女 4:6</option>
                  <option value={0.45}>男女 4.5:5.5</option>
                  <option value={0.55}>男女 5.5:4.5</option>
                  <option value={0.6}>男女 6:4</option>
                </select>
                <input className="form-input" type="number" placeholder="宿舍数量" value={schoolForm.dormCount || ""} onChange={e => setSchoolForm(f => ({ ...f, dormCount: Number(e.target.value) }))} />
              </div>
              <input className="form-input" type="date" placeholder="开学时间" value={schoolForm.semesterStart} onChange={e => setSchoolForm(f => ({ ...f, semesterStart: e.target.value }))} />
              <input className="form-input" type="date" placeholder="军训时间" value={schoolForm.militaryStart} onChange={e => setSchoolForm(f => ({ ...f, militaryStart: e.target.value }))} />
              <input className="form-input" type="date" placeholder="报到时间" value={schoolForm.registerStart} onChange={e => setSchoolForm(f => ({ ...f, registerStart: e.target.value }))} />
            </div>
          </section>

          {/* Business info */}
          <section className="panel p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-ink">校园业务</h2>
              <p className="mt-0.5 text-xs text-muted-light">勾选经营业务</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_TYPES.map(b => (
                <label key={b.key} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[12px] cursor-pointer transition-colors ${bizCheck[b.key as keyof typeof bizCheck] ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-canvas-alt border-line text-muted"}`}>
                  <input type="checkbox" className="sr-only" checked={bizCheck[b.key as keyof typeof bizCheck]} onChange={e => setBizCheck(prev => ({ ...prev, [b.key]: e.target.checked }))} />
                  {b.label}
                </label>
              ))}
            </div>
            <div className="grid gap-2">
              <input className="form-input" type="number" placeholder="竞争团队数量" value={bizMeta.competitorCount} onChange={e => setBizMeta(prev => ({ ...prev, competitorCount: e.target.value }))} />
              <input className="form-input" type="number" placeholder="往年成交人数" value={bizMeta.lastYearDeals} onChange={e => setBizMeta(prev => ({ ...prev, lastYearDeals: e.target.value }))} />
              <input className="form-input" placeholder="往年转化率" value={bizMeta.lastYearRate} onChange={e => setBizMeta(prev => ({ ...prev, lastYearRate: e.target.value }))} />
            </div>
          </section>

          {/* Social stats */}
          <section className="panel overflow-hidden xl:col-span-3">
            <div className="border-b border-line/50 px-5 py-3.5">
              <h2 className="text-sm font-bold text-ink">新媒体数据</h2>
              <p className="mt-0.5 text-xs text-muted-light">填写各平台现有数据，留空则视为新起号</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-line/50 bg-canvas-alt/30">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">平台</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">账号</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">发布</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">曝光</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">赞</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">收藏</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">评论</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">私信</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">进群</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">成交</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {socialStats.map((s, i) => (
                    <tr key={s.platform}>
                      <td className="px-4 py-2"><PlatformBadge platform={s.platform} /></td>
                      {["accountCount", "publishCount", "exposure", "likes", "favorites", "comments", "privateMessages", "groups", "deals"].map(f => (
                        <td key={f} className="px-4 py-2">
                          <input className="form-input text-center text-[12px] py-1.5 px-1 w-16" type="number" placeholder="0" value={s[f as keyof typeof s] || ""} onChange={e => updateSocialStat(i, f, e.target.value)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Generate button */}
          <div className="xl:col-span-3 flex items-center gap-4">
            <button className="button-primary" disabled={loading || !selectedSchoolId} onClick={generatePlan} type="button">
              {loading ? <Loader2 className="animate-spin" size={15} /> : <Zap size={15} />}
              {loading ? "AI 分析中..." : "生成运营方案"}
            </button>
            {loading ? <button className="button-ghost text-xs text-coral-600" onClick={cancelJob} type="button">取消</button> : null}
            {message ? <span className="text-[13px] text-coral-600">{message}</span> : null}
          </div>
        </div>
      ) : null}

      {/* Result Tab */}
      {activeTab === "result" && plan ? (
        <div className="space-y-5">
          {/* Top cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="panel p-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-muted-light">校区评级</div>
              <div className={`mt-1 text-2xl font-extrabold ${plan.schoolLevel === "A级" ? "text-emerald-600" : plan.schoolLevel === "B级" ? "text-amber-600" : "text-slate-600"}`}>{plan.schoolLevel || "-"}</div>
            </div>
            <div className="panel p-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-muted-light">投入等级</div>
              <div className="mt-1 text-2xl font-extrabold text-ink">{plan.investmentLevel || "-"}</div>
            </div>
            {plan.prediction ? (
              <>
                <div className="panel p-4 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-muted-light">预计曝光</div>
                  <div className="mt-1 text-2xl font-extrabold text-brand-600">{compactNumber(plan.prediction.exposure)}</div>
                </div>
                <div className="panel p-4 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-muted-light">预计私信</div>
                  <div className="mt-1 text-2xl font-extrabold text-brand-600">{compactNumber(plan.prediction.privateMessages)}</div>
                </div>
                <div className="panel p-4 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-muted-light">预计转化率</div>
                  <div className="mt-1 text-2xl font-extrabold text-emerald-600">{plan.prediction.conversionRate || "-"}</div>
                </div>
              </>
            ) : null}
          </div>

          {/* Platform comparison chart */}
          {socialStats.filter(s => s.exposure > 0 || s.likes > 0).length > 0 ? (
            <section className="panel p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4"><BarChart3 size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">新媒体数据对比</h2></div>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["exposure","likes","privateMessages"] as const).map((metric, mi) => {
                  const maxVal = Math.max(...socialStats.map(s => Number(s[metric]) || 0), 1);
                  const labels: Record<string, string> = { exposure: "曝光", likes: "点赞", privateMessages: "私信" };
                  const colors = ["bg-brand-400", "bg-coral-400", "bg-emerald-400"];
                  return (
                    <div key={metric} className="space-y-2">
                      <div className="text-[11px] font-bold uppercase text-muted-light">{labels[metric]}</div>
                      {socialStats.filter(s => Number(s[metric]) > 0).map((s, si) => {
                        const val = Number(s[metric]) || 0;
                        const pct = Math.max((val / maxVal) * 100, 3);
                        return (
                          <div key={s.platform} className="flex items-center gap-2">
                            <span className="text-[11px] w-10 text-right shrink-0 text-muted">{s.platform}</span>
                            <div className="flex-1 bg-canvas-alt rounded h-5 relative overflow-hidden">
                              <div className={`absolute inset-y-0 left-0 rounded ${colors[si % 3]}`} style={{ width: `${pct}%` }} />
                              <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-semibold text-white mix-blend-difference">{compactNumber(val)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Stage analysis — rendered below with enhanced fields */}
          {/* 15-Day Plan */}
          <section className="panel overflow-hidden">
            <div className="border-b border-line/50 px-5 py-3.5 flex items-center gap-2">
              <Calendar size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">15 天运营计划</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead>
                  <tr className="border-b border-line/50 bg-canvas-alt/30">
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">日期</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">阶段</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">目标</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">内容方向</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">平台</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">预估指标</th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">负责人</th>
                    <th className="px-4 py-2.5 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/50">
                  {plan.plan15Days?.map((day, i) => (
                    <tr key={i} className="transition-colors hover:bg-canvas-alt/20">
                      <td className="px-4 py-3 text-[12px] font-semibold whitespace-nowrap">{day.date}</td>
                      <td className="px-4 py-3 text-[11px]"><span className={`badge ${day.phase === "冲刺" ? "bg-coral-50 text-coral-700" : day.phase === "转化" ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700"}`}>{day.phase || "-"}</span></td>
                      <td className="px-4 py-3 text-[13px] max-w-[140px]">{day.goal}</td>
                      <td className="px-4 py-3 text-[12px] text-ink-soft max-w-[160px]">{day.contentDirection || day.platformTasks?.map(t => t.title).join(" · ") || "-"}</td>
                      <td className="px-4 py-3 text-[12px]">{day.recommendedPlatform || day.platformTasks?.map(t => t.platform).join("/") || "-"}</td>
                      <td className="px-4 py-3 text-[12px] tabular-nums">
                        {day.targetMetrics ? `${compactNumber(day.targetMetrics.曝光)}曝光 · ${compactNumber(day.targetMetrics.私信)}私信` : day.expectedExposure ? compactNumber(day.expectedExposure) : "-"}
                      </td>
                      <td className="px-4 py-3 text-[12px]">{day.personInCharge || "-"}</td>
                      <td className="px-4 py-3">
                        {syncDayIdx === i ? (
                          <div className="flex items-center gap-1.5">
                            <select className="form-input text-[11px] py-1 px-1.5 w-28" value={syncAccountId} onChange={e => setSyncAccountId(e.target.value)}>
                              <option value="">选账号</option>
                              {platformAccounts.filter(a => !selectedSchoolId || a.school_id === selectedSchoolId).map(a => (
                                <option key={a.id} value={a.id}>{a.account_name} · {a.platform}</option>
                              ))}
                            </select>
                            <button className="button-primary text-[10px] py-1 px-2" disabled={syncing} onClick={() => syncToTask(day)} type="button">确定</button>
                            <button className="text-[10px] text-muted hover:text-ink" onClick={() => { setSyncDayIdx(null); setSyncMsg(""); }} type="button">取消</button>
                            {syncMsg ? <span className="text-[10px] whitespace-nowrap">{syncMsg}</span> : null}
                          </div>
                        ) : (
                          <button className="button-ghost text-[10px] text-brand-600 hover:underline" onClick={() => { setSyncDayIdx(i); setSyncAccountId(""); setSyncMsg(""); }} type="button">创建任务</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Growth strategy */}
          {plan.growthStrategy ? (
            <section className="panel p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">增长策略</h2></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-bold uppercase text-muted-light mb-1">引流获客</div>
                  <p className="text-[13px] text-ink-soft">{plan.growthStrategy.trafficStrategy}</p>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-muted-light mb-1">私域转化</div>
                  <p className="text-[13px] text-ink-soft">{plan.growthStrategy.conversionStrategy}</p>
                </div>
                {plan.growthStrategy.platformStrategy ? (
                  <div className="sm:col-span-2">
                    <div className="text-[11px] font-bold uppercase text-muted-light mb-1">平台策略</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {Object.entries(plan.growthStrategy.platformStrategy).map(([p, s]) => (
                        <div key={p} className="bg-canvas-alt rounded p-3">
                          <div className="text-[12px] font-semibold text-ink mb-0.5">{p}</div>
                          <p className="text-[12px] text-muted">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {plan.growthStrategy.contentRotation ? (
                  <div className="sm:col-span-2">
                    <div className="text-[11px] font-bold uppercase text-muted-light mb-1">内容轮转</div>
                    <p className="text-[13px] text-ink-soft">{plan.growthStrategy.contentRotation}</p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Stage analysis */}
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4"><Target size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">运营阶段分析</h2></div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[13px] font-semibold text-ink">当前阶段：{plan.stageAnalysis?.currentStage || "-"}</span>
              {plan.stageAnalysis?.timeWindow ? <span className="text-[12px] text-muted">{plan.stageAnalysis.timeWindow}</span> : null}
            </div>
            <p className="text-[13px] text-ink-soft mb-3">{plan.stageAnalysis?.stageGoal}</p>
            {plan.stageAnalysis?.strategyBrief ? <p className="text-[13px] text-muted mb-3">{plan.stageAnalysis.strategyBrief}</p> : null}
            {plan.stageAnalysis?.recommendedContent?.length ? (
              <div className="flex flex-wrap gap-1.5 mb-3">{plan.stageAnalysis.recommendedContent.map((c, i) => <span key={i} className="badge bg-brand-50 text-brand-700 text-[11px]">{c}</span>)}</div>
            ) : null}
            {plan.stageAnalysis?.focusActions?.length ? (
              <ul className="space-y-1">{plan.stageAnalysis.focusActions.map((a, i) => <li key={i} className="text-[13px] text-muted flex gap-2"><Zap size={12} className="mt-0.5 shrink-0 text-amber-500" />{a}</li>)}</ul>
            ) : null}
          </section>

          {/* Diagnosis + Team Tasks + Risks */}
          <div className="grid gap-5 xl:grid-cols-3">
            <section className="panel p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3"><Brain size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">AI 诊断</h2></div>
              <div className="space-y-3">
                {plan.diagnosis?.map((d, i) => (
                  <div key={i} className="border-l-2 border-coral-400 bg-coral-50/50 pl-3 py-1.5 pr-2 rounded-r">
                    <div className="text-[13px] font-semibold text-ink">{d.issue}</div>
                    <div className="text-[12px] text-muted mt-0.5">{(d.rootCause || d.reason)}</div>
                    {d.impact ? <div className="text-[12px] text-coral-500 mt-0.5">影响：{d.impact}</div> : null}
                    <div className="text-[12px] text-brand-600 mt-0.5">→ {d.suggestion}</div>
                  </div>
                ))}
              </div>
            </section>

            {plan.teamTasks ? (
              <section className="panel p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3"><ClipboardList size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">团队任务</h2></div>
                <div className="space-y-3">
                  {Object.entries(plan.teamTasks).map(([role, tasks]) => (
                    <div key={role}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-light mb-1">{role}</div>
                      <ul className="space-y-0.5">
                        {(tasks as string[]).map((t, i) => <li key={i} className="text-[12px] text-ink-soft">· {t}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {plan.risks?.length ? (
              <section className="panel p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-coral-500" /><h2 className="text-sm font-bold text-ink">风险预警</h2></div>
                <div className="space-y-3">
                  {plan.risks.map((r, i) => (
                    <div key={i} className={`border-l-2 pl-3 py-1.5 pr-2 rounded-r ${r.level === "高" ? "border-coral-400 bg-coral-50/50" : r.level === "中" ? "border-amber-400 bg-amber-50/50" : "border-slate-300 bg-canvas-alt"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-ink">{r.risk}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.level === "高" ? "bg-coral-100 text-coral-700" : r.level === "中" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"}`}>{r.level}风险</span>
                      </div>
                      {r.probability ? <div className="text-[12px] text-muted mt-0.5">概率：{r.probability}</div> : null}
                      <div className="text-[12px] text-muted mt-0.5">触发：{r.trigger}</div>
                      {r.impact ? <div className="text-[12px] text-muted mt-0.5">影响：{r.impact}</div> : null}
                      <div className="text-[12px] text-brand-600 mt-0.5">→ {r.mitigation || r.solution}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Bottom actions */}
          <div className="flex items-center gap-3">
            <button className="button-secondary text-xs" onClick={() => { setActiveTab("form"); setPlan(null); }} type="button"><Plus size={13} /> 新建方案</button>
            <button className="button-secondary text-xs" onClick={() => { const el = document.createElement("a"); el.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(plan, null, 2))}`; el.download = "运营方案.json"; el.click(); }} type="button"><Download size={13} /> 导出 JSON</button>
          </div>
        </div>
      ) : null}

      {/* History Tab */}
      {activeTab === "history" ? (
        <section className="panel overflow-hidden">
          <div className="border-b border-line/50 px-5 py-3.5 flex items-center gap-2">
            <Calendar size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">历史方案</h2>
          </div>
          {plans.length ? (
            <div className="divide-y divide-line/50">
              {plans.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-canvas-alt/30">
                  <div>
                    <div className="text-[13px] font-semibold text-ink">{p.schools?.name ?? "未知学校"}{p.schools?.campus_name ? ` · ${p.schools.campus_name}` : ""}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] font-bold ${p.school_level === "A级" ? "text-emerald-600" : p.school_level === "B级" ? "text-amber-600" : "text-slate-500"}`}>{p.school_level || "-"}</span>
                      <span className="text-[11px] text-muted">投入 {p.investment_level || "-"}</span>
                      <span className="text-[11px] text-muted-light">{new Date(p.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="button-secondary text-[11px]" onClick={() => loadPlan(p.id)} type="button">查看</button>
                    <button className="button-ghost text-[11px] text-muted hover:text-coral-600" onClick={() => deletePlan(p.id)} type="button"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-[13px] text-muted-light">暂无历史方案</div>
          )}
        </section>
      ) : null}
    </div>
  );
}
