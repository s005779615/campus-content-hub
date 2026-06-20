"use client";

import { BarChart3, Brain, Loader2, Plus, Target, Trash2, TrendingUp, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

type NextMove = {
  priority: number;
  action: string;
  contentDirection: string;
  reason: string;
  targetPlatform: string;
  publishRhythm: string;
  funnelDesign: string;
  targetMetrics: { 期望曝光: number; 期望私信: number; 期望进群: number };
  duration: number;
};

type PlanData = {
  schoolLevel: string;
  investmentLevel: string;
  currentPhase: { phase: string; phaseGoal: string; daysInPhase: number; phaseSummary: string };
  nextMoves: NextMove[];
  diagnosis: Array<{ issue: string; rootCause: string; impact: string; suggestion: string }>;
  growthStrategy: { trafficStrategy: string; conversionStrategy: string; platformAllocation: Record<string, string>; contentRotation: string };
  teamFocus: Record<string, string>;
  risks: Array<{ risk: string; level: string; probability: string; trigger: string; impact: string; mitigation: string }>;
  topicTracking: { newlyUsed: string[]; markAsHot: string[]; markAsDead: string[] };
  prediction: { exposure: number; privateMessages: number; groups: number; orders: number; conversionRate: string };
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
  platform: p, accountCount: 0, publishCount: 0, exposure: 0,
  likes: 0, favorites: 0, comments: 0, privateMessages: 0, groups: 0, deals: 0,
}));

export function OperationsClient({
  profile, schools, initialPlans, platformAccounts,
}: {
  profile: { role: string };
  schools: SchoolRecord[];
  initialPlans: PlanRecord[];
  platformAccounts: Array<{ id: string; school_id: string; user_id: string; platform: string; account_name: string }>;
}) {
  // Form
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [schoolForm, setSchoolForm] = useState({ totalStudents: 0, newStudents: 0, maleRatio: 0.5, dormCount: 0, semesterStart: "", militaryStart: "", registerStart: "", campusName: "" });
  const [bizCheck, setBizCheck] = useState({ phoneCards: false, bedding: false, partTime: false, errands: false, secondHand: false });
  const [bizMeta, setBizMeta] = useState({ competitorCount: "", lastYearDeals: "", lastYearRate: "" });
  const [socialStats, setSocialStats] = useState(defaultSocialStats);

  // Result
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"form" | "result" | "history">("form");
  const [plans, setPlans] = useState<PlanRecord[]>(initialPlans);
  const abortRef = useRef<AbortController | null>(null);

  // Topic tracking
  const [usedTopics, setUsedTopics] = useState<string[]>([]);
  const [hotTopics, setHotTopics] = useState<string[]>([]);
  const [deadTopics, setDeadTopics] = useState<string[]>([]);

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  useEffect(() => {
    if (selectedSchool) setSchoolForm(f => ({ ...f, campusName: selectedSchool.campus_name || "" }));
  }, [selectedSchoolId]);

  function cancelJob() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
    setMessage("已取消");
  }

  async function generatePlan() {
    if (!selectedSchoolId || !selectedSchool) return;
    setLoading(true);
    setMessage("正在获取 AI 配置...");
    setPlan(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Step 1: Get AI credentials + prompt
      const [cfgRes, promptRes] = await Promise.all([
        fetch("/api/operations/config", { signal: controller.signal }),
        fetch("/api/operations/prompt", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({
            school: {
              name: selectedSchool.name,
              campusName: selectedSchool.campus_name || schoolForm.campusName,
              totalStudents: schoolForm.totalStudents, newStudents: schoolForm.newStudents,
              maleRatio: schoolForm.maleRatio, dormCount: schoolForm.dormCount,
              semesterStart: schoolForm.semesterStart,
              militaryStart: schoolForm.militaryStart || undefined,
              registerStart: schoolForm.registerStart || undefined,
            },
            businesses: {
              phoneCards: bizCheck.phoneCards, bedding: bizCheck.bedding, partTime: bizCheck.partTime,
              errands: bizCheck.errands, secondHand: bizCheck.secondHand,
              competitorCount: Number(bizMeta.competitorCount) || 0,
              lastYearDeals: Number(bizMeta.lastYearDeals) || 0,
              lastYearRate: bizMeta.lastYearRate || "0%",
            },
            socialStats: socialStats.filter(s => s.accountCount > 0 || s.publishCount > 0),
            usedTopics, hotTopics, deadTopics,
          }),
        }),
      ]);
      const [cfg, promptData] = await Promise.all([cfgRes.json(), promptRes.json()]);
      if (!cfg.ok || !promptData.prompt) { setMessage("配置获取失败"); setLoading(false); return; }

      // Step 2: Call AI via Vercel proxy (streaming SSE → 30s window)
      setMessage("AI 分析中...");
      const proxyRes = await fetch("/api/operations/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model, prompt: promptData.prompt, schoolId: selectedSchoolId }),
        signal: controller.signal,
      });
      if (!proxyRes.ok || !proxyRes.body) { setMessage(`代理错误 ${proxyRes.status}`); setLoading(false); return; }

      // Read SSE stream
      const reader = proxyRes.body.getReader();
      const decoder2 = new TextDecoder();
      let buf2 = "";
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf2 += decoder2.decode(value, { stream: true });
        const lines = buf2.split("\n");
        buf2 = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.t === "chunk") { text += (evt.c || ""); if (text.length % 200 < 20) setMessage(`已接收 ${text.length} 字符`); }
              else if (evt.t === "done") { text = evt.content || text; }
              else if (evt.t === "error") { setMessage(evt.msg || "中断"); setLoading(false); return; }
            } catch { /* skip */ }
          }
        }
      }
      if (!text) { setMessage("AI 返回为空"); setLoading(false); return; }

      setMessage("解析中...");
      const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      let parsed: any;
      try { parsed = JSON.parse(jsonStr); } catch {
        const m = jsonStr.match(/\{[\s\S]*\}/);
        if (!m) { setMessage("JSON 解析失败"); setLoading(false); return; }
        parsed = JSON.parse(m[0]);
      }

      // Step 3: Save
      await fetch("/api/operations/plan/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: parsed, schoolId: selectedSchoolId }),
        signal: controller.signal,
      });

      // Update topic tracking
      if (parsed.topicTracking) {
        setUsedTopics(prev => [...new Set([...prev, ...(parsed.topicTracking.newlyUsed || [])])]);
        setHotTopics(prev => [...new Set([...prev, ...(parsed.topicTracking.markAsHot || [])])]);
        setDeadTopics(prev => [...new Set([...prev, ...(parsed.topicTracking.markAsDead || [])])]);
      }

      setPlan(parsed);
      setActiveTab("result");
      setMessage("");
      fetch("/api/operations/plans").then(r => r.json()).then(d2 => setPlans(d2.plans ?? []));
    } catch (e: any) {
      if (e?.name === "AbortError") setMessage("已取消");
      else setMessage(e?.message || "网络中断");
    }
    setLoading(false);
    abortRef.current = null;
  }

  async function loadPlan(id: string) {
    const res = await fetch(`/api/operations/plans/${id}`);
    const d = await res.json();
    if (res.ok && d.plan) {
      setPlan(d.plan.plan_data);
      setActiveTab("result");
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/operations/plans/${id}`, { method: "DELETE" });
    setPlans(p => p.filter(x => x.id !== id));
  }

  function updateSocialStat(idx: number, field: string, value: string) {
    setSocialStats(prev => prev.map((s, i) => i === idx ? { ...s, [field]: field === "platform" ? value : Number(value) || 0 } : s));
  }

  // ==================== RENDER ====================
  return (
    <div className="mt-5 space-y-5">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-line/50 pb-0">
        {(["form", "result", "history"] as const).map((key) => (
          <button key={key} className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${activeTab === key ? "border-brand-500 text-ink" : "border-transparent text-muted hover:text-ink-soft"}`} onClick={() => setActiveTab(key)} type="button">{key === "form" ? "数据录入" : key === "result" ? "AI 方案" : "历史记录"}</button>
        ))}
        {/* Topic stats */}
        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-light self-center">
          {usedTopics.length > 0 ? <span>已用 {usedTopics.length} 方向</span> : null}
          {hotTopics.length > 0 ? <span>{hotTopics.length} 爆过</span> : null}
          {deadTopics.length > 0 ? <span>{deadTopics.length} 已弃</span> : null}
        </div>
      </div>

      {/* === Form Tab === */}
      {activeTab === "form" ? <div className="grid gap-5 xl:grid-cols-3">
        <section className="panel p-5 sm:p-6 space-y-4 xl:col-span-2">
          <h2 className="text-sm font-bold text-ink">学校信息</h2>
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
                <option value={0.5}>5:5</option><option value={0.4}>4:6</option><option value={0.6}>6:4</option>
              </select>
              <input className="form-input" type="number" placeholder="宿舍数量" value={schoolForm.dormCount || ""} onChange={e => setSchoolForm(f => ({ ...f, dormCount: Number(e.target.value) }))} />
            </div>
            <input className="form-input" type="date" placeholder="开学" value={schoolForm.semesterStart} onChange={e => setSchoolForm(f => ({ ...f, semesterStart: e.target.value }))} />
            <input className="form-input" type="date" placeholder="军训" value={schoolForm.militaryStart} onChange={e => setSchoolForm(f => ({ ...f, militaryStart: e.target.value }))} />
            <input className="form-input" type="date" placeholder="报到" value={schoolForm.registerStart} onChange={e => setSchoolForm(f => ({ ...f, registerStart: e.target.value }))} />
          </div>
        </section>

        <section className="panel p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-ink">业务 & 去重</h2>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map(b => (
              <label key={b.key} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-[12px] cursor-pointer ${bizCheck[b.key as keyof typeof bizCheck] ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-canvas-alt border-line text-muted"}`}>
                <input type="checkbox" className="sr-only" checked={bizCheck[b.key as keyof typeof bizCheck]} onChange={e => setBizCheck(prev => ({ ...prev, [b.key]: e.target.checked }))} />{b.label}
              </label>
            ))}
          </div>
          <div className="grid gap-2">
            <input className="form-input" type="number" placeholder="竞争团队数量" value={bizMeta.competitorCount} onChange={e => setBizMeta(p => ({ ...p, competitorCount: e.target.value }))} />
            <input className="form-input" type="number" placeholder="往年成交人数" value={bizMeta.lastYearDeals} onChange={e => setBizMeta(p => ({ ...p, lastYearDeals: e.target.value }))} />
            <input className="form-input" placeholder="往年转化率" value={bizMeta.lastYearRate} onChange={e => setBizMeta(p => ({ ...p, lastYearRate: e.target.value }))} />
          </div>
          {/* Topic lists */}
          {usedTopics.length > 0 && <div className="text-[11px] text-muted-light">已用方向：{usedTopics.join(" · ")}</div>}
          {hotTopics.length > 0 && <div className="text-[11px] text-amber-600">爆过：{hotTopics.join(" · ")}</div>}
          {deadTopics.length > 0 && <div className="text-[11px] text-coral-600">已弃：{deadTopics.join(" · ")}</div>}
        </section>

        <section className="panel overflow-hidden xl:col-span-3">
          <div className="border-b border-line/50 px-5 py-3.5"><h2 className="text-sm font-bold text-ink">新媒体数据</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead><tr className="border-b border-line/50 bg-canvas-alt/30">
                {["平台","账号","发布","曝光","赞","收藏","评论","私信","进群","成交"].map(h => <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-light">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-line/50">
                {socialStats.map((s, i) => (
                  <tr key={s.platform}><td className="px-4 py-2"><PlatformBadge platform={s.platform} /></td>
                    {["accountCount","publishCount","exposure","likes","favorites","comments","privateMessages","groups","deals"].map(f => (
                      <td key={f} className="px-4 py-2"><input className="form-input text-center text-[12px] py-1.5 px-1 w-16" type="number" placeholder="0" value={s[f as keyof typeof s] || ""} onChange={e => updateSocialStat(i, f, e.target.value)} /></td>))}
                  </tr>))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="xl:col-span-3 flex items-center gap-4">
          <button className="button-primary" disabled={loading || !selectedSchoolId} onClick={generatePlan} type="button">
            {loading ? <Loader2 className="animate-spin" size={15} /> : <Zap size={15} />}
            {loading ? "AI 决策中..." : "获取运营决策"}
          </button>
          {loading ? <button className="button-ghost text-xs text-coral-600" onClick={cancelJob} type="button">取消</button> : null}
          {message ? <span className="text-[13px] text-ink-soft">{message}</span> : null}
        </div>
      </div> : null}

      {/* === Result Tab === */}
      {activeTab === "result" && plan ? <div className="space-y-5">
        {/* Top cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="panel p-4 text-center">
            <div className="text-[11px] uppercase text-muted-light">校区评级</div>
            <div className={`mt-1 text-2xl font-extrabold ${plan.schoolLevel === "A级" ? "text-emerald-600" : plan.schoolLevel === "B级" ? "text-amber-600" : "text-slate-600"}`}>{plan.schoolLevel || "-"}</div>
          </div>
          <div className="panel p-4 text-center">
            <div className="text-[11px] uppercase text-muted-light">当前阶段</div>
            <div className="mt-1 text-lg font-extrabold text-brand-600">{plan.currentPhase?.phase || "-"}</div>
            <div className="text-[11px] text-muted mt-0.5">第 ~{plan.currentPhase?.daysInPhase || 0} 天</div>
          </div>
          {plan.prediction ? <>
            <div className="panel p-4 text-center"><div className="text-[11px] uppercase text-muted-light">预计曝光</div><div className="mt-1 text-2xl font-extrabold text-brand-600">{compactNumber(plan.prediction.exposure)}</div></div>
            <div className="panel p-4 text-center"><div className="text-[11px] uppercase text-muted-light">预计私信</div><div className="mt-1 text-2xl font-extrabold text-brand-600">{compactNumber(plan.prediction.privateMessages)}</div></div>
            <div className="panel p-4 text-center"><div className="text-[11px] uppercase text-muted-light">预计转化率</div><div className="mt-1 text-2xl font-extrabold text-emerald-600">{plan.prediction.conversionRate || "-"}</div></div>
          </> : null}
        </div>

        {/* Phase overview */}
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3"><Target size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">运营阶段</h2></div>
          <p className="text-[13px] text-ink-soft font-semibold">{plan.currentPhase?.phaseGoal}</p>
          <p className="text-[13px] text-muted mt-1">{plan.currentPhase?.phaseSummary}</p>
        </section>

        {/* Next moves */}
        <section className="panel overflow-hidden">
          <div className="border-b border-line/50 px-5 py-3.5 flex items-center gap-2"><Zap size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">下一步运营动作</h2></div>
          <div className="divide-y divide-line/50">
            {plan.nextMoves?.map((m, i) => (
              <div key={i} className="px-5 py-4 transition-colors hover:bg-canvas-alt/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-muted-light">#{m.priority}</span>
                      <span className="text-[13px] font-semibold text-ink">{m.action}</span>
                      <PlatformBadge platform={m.targetPlatform} />
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2"><span className="text-[11px] font-bold text-muted-light w-16 shrink-0">内容方向</span><span className="text-[12px] text-brand-600 font-medium">{m.contentDirection}</span></div>
                      <div className="flex items-start gap-2"><span className="text-[11px] font-bold text-muted-light w-16 shrink-0">原因</span><span className="text-[12px] text-muted">{m.reason}</span></div>
                      <div className="flex items-start gap-2"><span className="text-[11px] font-bold text-muted-light w-16 shrink-0">引流路径</span><span className="text-[12px] text-muted">{m.funnelDesign}</span></div>
                      <div className="flex items-center gap-3"><span className="text-[11px] font-bold text-muted-light w-16 shrink-0">节奏</span><span className="text-[12px]">{m.publishRhythm}</span><span className="text-[12px] text-muted">执行 {m.duration} 天</span></div>
                      <div className="flex items-center gap-3"><span className="text-[11px] font-bold text-muted-light w-16 shrink-0">目标</span><span className="text-[12px] tabular-nums text-brand-600 font-semibold">{compactNumber(m.targetMetrics?.期望曝光 || 0)} 曝光 · {compactNumber(m.targetMetrics?.期望私信 || 0)} 私信 · {compactNumber(m.targetMetrics?.期望进群 || 0)} 进群</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Growth strategy */}
        {plan.growthStrategy ? <section className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">增长策略</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><div className="text-[11px] font-bold uppercase text-muted-light mb-1">引流获客</div><p className="text-[13px] text-ink-soft">{plan.growthStrategy.trafficStrategy}</p></div>
            <div><div className="text-[11px] font-bold uppercase text-muted-light mb-1">私域转化</div><p className="text-[13px] text-ink-soft">{plan.growthStrategy.conversionStrategy}</p></div>
            {plan.growthStrategy.platformAllocation ? <div className="sm:col-span-2 grid gap-2 sm:grid-cols-3">
              {Object.entries(plan.growthStrategy.platformAllocation).map(([p, s]) => <div key={p} className="bg-canvas-alt rounded p-3"><div className="text-[12px] font-semibold text-ink mb-0.5">{p}</div><p className="text-[12px] text-muted">{s}</p></div>)}
            </div> : null}
            {plan.growthStrategy.contentRotation ? <div className="sm:col-span-2"><div className="text-[11px] font-bold uppercase text-muted-light mb-1">内容轮转</div><p className="text-[13px] text-ink-soft">{plan.growthStrategy.contentRotation}</p></div> : null}
          </div>
        </section> : null}

        {/* Diagnosis + Team + Risks */}
        <div className="grid gap-5 xl:grid-cols-3">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3"><Brain size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">AI 诊断</h2></div>
            <div className="space-y-3">
              {plan.diagnosis?.map((d, i) => (
                <div key={i} className="border-l-2 border-coral-400 bg-coral-50/50 pl-3 py-1.5 pr-2 rounded-r">
                  <div className="text-[13px] font-semibold text-ink">{d.issue}</div>
                  <div className="text-[12px] text-muted mt-0.5">{d.rootCause}</div>
                  {d.impact ? <div className="text-[12px] text-coral-500 mt-0.5">影响：{d.impact}</div> : null}
                  <div className="text-[12px] text-brand-600 mt-0.5">→ {d.suggestion}</div>
                </div>))}
            </div>
          </section>

          {plan.teamFocus ? <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3"><Target size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">团队焦点</h2></div>
            <div className="space-y-3">{Object.entries(plan.teamFocus).map(([role, task]) => <div key={role}><div className="text-[11px] font-bold uppercase text-muted-light mb-1">{role}</div><p className="text-[12px] text-ink-soft">{task as string}</p></div>)}</div>
          </section> : null}

          {plan.risks?.length ? <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-coral-500" /><h2 className="text-sm font-bold text-ink">风险预警</h2></div>
            <div className="space-y-3">{plan.risks.map((r, i) => (
              <div key={i} className={`border-l-2 pl-3 py-1.5 pr-2 rounded-r ${r.level === "高" ? "border-coral-400 bg-coral-50/50" : r.level === "中" ? "border-amber-400 bg-amber-50/50" : "border-slate-300 bg-canvas-alt"}`}>
                <div className="flex items-center gap-2"><span className="text-[13px] font-semibold text-ink">{r.risk}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.level === "高" ? "bg-coral-100 text-coral-700" : "bg-amber-100 text-amber-700"}`}>{r.level}风险</span></div>
                {r.probability ? <div className="text-[12px] text-muted mt-0.5">概率：{r.probability}</div> : null}
                <div className="text-[12px] text-muted mt-0.5">触发：{r.trigger}</div>
                <div className="text-[12px] text-brand-600 mt-0.5">→ {r.mitigation}</div>
              </div>))}</div>
          </section> : null}
        </div>

        {/* Topic tracking */}
        {plan.topicTracking ? <section className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3"><BarChart3 size={16} className="text-brand-500" /><h2 className="text-sm font-bold text-ink">方向追踪</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="bg-brand-50 rounded p-3"><div className="text-[11px] font-bold text-brand-700 mb-1">本次新增</div><div className="text-[12px] text-brand-600">{plan.topicTracking.newlyUsed?.join(" · ") || "无"}</div></div>
            <div className="bg-amber-50 rounded p-3"><div className="text-[11px] font-bold text-amber-700 mb-1">可标记为爆款</div><div className="text-[12px] text-amber-600">{plan.topicTracking.markAsHot?.join(" · ") || "无"}</div></div>
            <div className="bg-coral-50 rounded p-3"><div className="text-[11px] font-bold text-coral-700 mb-1">建议放弃</div><div className="text-[12px] text-coral-600">{plan.topicTracking.markAsDead?.join(" · ") || "无"}</div></div>
          </div>
        </section> : null}

        <div className="flex items-center gap-3">
          <button className="button-secondary text-xs" onClick={() => { setActiveTab("form"); setPlan(null); }} type="button"><Plus size={13} /> 重新决策</button>
        </div>
      </div> : null}

      {/* === History Tab === */}
      {activeTab === "history" ? <section className="panel overflow-hidden">
        <div className="border-b border-line/50 px-5 py-3.5"><h2 className="text-sm font-bold text-ink">历史决策</h2></div>
        {plans.length ? <div className="divide-y divide-line/50">
          {plans.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-canvas-alt/30">
              <div>
                <div className="text-[13px] font-semibold text-ink">{p.schools?.name ?? "未知"}</div>
                <div className="flex gap-2 mt-0.5">
                  <span className={`text-[11px] font-bold ${p.school_level === "A级" ? "text-emerald-600" : p.school_level === "B级" ? "text-amber-600" : "text-slate-500"}`}>{p.school_level || "-"}</span>
                  <span className="text-[11px] text-muted">{new Date(p.created_at).toLocaleDateString("zh-CN")}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="button-secondary text-[11px]" onClick={() => loadPlan(p.id)} type="button">查看</button>
                <button className="button-ghost text-[11px] text-muted hover:text-coral-600" onClick={() => deletePlan(p.id)} type="button"><Trash2 size={12} /></button>
              </div>
            </div>))}
        </div> : <div className="px-5 py-10 text-center text-[13px] text-muted-light">暂无历史</div>}
      </section> : null}
    </div>
  );
}
