"use client";

import { Brain, Loader2, TrendingUp, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import type { SchoolRecord } from "@/lib/types";

type PlanRecord = {
  id: string;
  created_at: string;
  schools?: { name: string; campus_name: string | null };
};

type DiagnosticData = {
  summary: string;
  issues: { traffic: string; engagement: string; conversion: string };
  platformDiagnosis: { "抖音": string; "小红书": string };
  rootCause: string;
  optimizationDirection: { contentAngle: string; userPsychology: string; platformFit: string };
};

const PLATFORMS = ["抖音", "小红书"];
const defaultSocialStats = PLATFORMS.map(p => ({
  platform: p, accountCount: 0, publishCount: 0, exposure: 0, likes: 0, favorites: 0,
  comments: 0, privateMessages: 0, groups: 0, deals: 0,
}));

export function OperationsClient({
  schools,
}: {
  profile: { role: string };
  schools: SchoolRecord[];
  initialPlans: PlanRecord[];
  platformAccounts: any[];
}) {
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [semesterStart, setSemesterStart] = useState("");
  const [newStudents, setNewStudents] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [competitorCount, setCompetitorCount] = useState("");
  const [socialStats, setSocialStats] = useState(defaultSocialStats);

  const [diagnosis, setDiagnosis] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  function cancelJob() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false); setMessage("已取消");
  }

  async function runDiagnosis() {
    if (!selectedSchoolId || !selectedSchool) return;
    setLoading(true); setMessage("正在获取数据..."); setDiagnosis(null);
    const controller = new AbortController(); abortRef.current = controller;

    try {
      // 1. Config + Prompt
      const [cfgRes, promptRes] = await Promise.all([
        fetch("/api/operations/config", { signal: controller.signal }),
        fetch("/api/operations/prompt", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({
            school: { name: selectedSchool.name, campusName: selectedSchool.campus_name, totalStudents, newStudents, semesterStart },
            businesses: { phoneCards: false, bedding: false, partTime: false, errands: false, secondHand: false, competitorCount: Number(competitorCount) || 0 },
            socialStats: socialStats.filter(s => s.accountCount > 0 || s.publishCount > 0),
          }),
        }),
      ]);
      const [cfg, promptData] = await Promise.all([cfgRes.json(), promptRes.json()]);
      if (!cfg.ok || !promptData.prompt) { setMessage("配置失败"); setLoading(false); return; }

      // 2. Proxy → AI
      setMessage("AI 诊断中...");
      const proxyRes = await fetch("/api/operations/proxy", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, model: cfg.model, prompt: promptData.prompt }),
      });
      if (!proxyRes.ok || !proxyRes.body) { setMessage(`代理错误 ${proxyRes.status}`); setLoading(false); return; }

      // 3. Read SSE
      const reader = proxyRes.body.getReader();
      const dec = new TextDecoder();
      let buf = "", text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.t === "chunk") text += (evt.c || "");
              else if (evt.t === "done") text = evt.content || text;
              else if (evt.t === "error") { setMessage(evt.msg || "中断"); setLoading(false); return; }
            } catch { /* skip */ }
          }
        }
      }
      if (!text) { setMessage("AI 返回为空"); setLoading(false); return; }

      // 4. Parse
      const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      let parsed: any;
      try { parsed = JSON.parse(jsonStr); } catch {
        const m = jsonStr.match(/\{[\s\S]*\}/);
        if (!m) { setMessage("JSON 解析失败"); setLoading(false); return; }
        parsed = JSON.parse(m[0]);
      }
      setDiagnosis(parsed);
      setMessage("");
    } catch (e: any) {
      if (e?.name === "AbortError") setMessage("已取消");
      else setMessage(e?.message || "中断");
    }
    setLoading(false); abortRef.current = null;
  }

  function updateStat(idx: number, field: string, value: string) {
    setSocialStats(prev => prev.map((s, i) => i === idx ? { ...s, [field]: field === "platform" ? value : Number(value) || 0 } : s));
  }

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-3">
      {/* Input Panel */}
      <section className="panel p-5 sm:p-6 space-y-4 xl:col-span-1">
        <h2 className="text-sm font-bold text-ink">诊断输入</h2>
        <select className="form-input" value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)}>
          <option value="">选择学校</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}{s.campus_name ? ` · ${s.campus_name}` : ""}</option>)}
        </select>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="form-input" type="number" placeholder="新生人数" value={newStudents || ""} onChange={e => setNewStudents(Number(e.target.value))} />
          <input className="form-input" type="number" placeholder="总学生数" value={totalStudents || ""} onChange={e => setTotalStudents(Number(e.target.value))} />
        </div>
        <input className="form-input" type="date" placeholder="开学时间" value={semesterStart} onChange={e => setSemesterStart(e.target.value)} />
        <input className="form-input" type="number" placeholder="竞争团队数" value={competitorCount} onChange={e => setCompetitorCount(e.target.value)} />

        {/* Platform data */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase text-muted-light">平台数据</div>
          {socialStats.map((s, i) => (
            <div key={s.platform} className="border border-line/50 rounded p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <PlatformBadge platform={s.platform} />
                <input className="form-input text-[12px] py-1 w-14" type="number" placeholder="账号数" value={s.accountCount || ""} onChange={e => updateStat(i, "accountCount", e.target.value)} />
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  ["publishCount", "发布"], ["exposure", "曝光"], ["likes", "赞"], ["favorites", "藏"],
                  ["comments", "评"], ["privateMessages", "私信"], ["groups", "进群"], ["deals", "成交"]
                ].map(([f, l]) => (
                  <input key={f} className="form-input text-[11px] py-1 px-1" type="number" placeholder={l} value={s[f as keyof typeof s] || ""} onChange={e => updateStat(i, f, e.target.value)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="button-primary text-xs" disabled={loading || !selectedSchoolId} onClick={runDiagnosis} type="button">
            {loading ? <Loader2 className="animate-spin" size={13} /> : <Zap size={13} />}
            {loading ? "诊断中..." : "运行诊断"}
          </button>
          {loading ? <button className="button-ghost text-xs text-coral-600" onClick={cancelJob} type="button">取消</button> : null}
        </div>
        {message ? <div className="text-[13px] text-ink-soft bg-canvas-alt rounded p-2">{message}</div> : null}
      </section>

      {/* Result Panel */}
      <section className="space-y-5 xl:col-span-2">
        {!diagnosis && !loading ? (
          <div className="panel p-10 text-center text-[13px] text-muted-light">
            选择学校 → 填数据 → 点「运行诊断」
          </div>
        ) : null}

        {diagnosis ? (
          <>
            {/* Summary */}
            <div className="panel p-5 flex items-center gap-3">
              <Brain size={20} className="text-brand-500 shrink-0" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-light">核心问题</div>
                <div className="text-[15px] font-bold text-ink">{diagnosis.summary}</div>
              </div>
            </div>

            {/* Issues */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="panel p-4 border-t-2 border-coral-400">
                <div className="text-[11px] font-bold uppercase text-coral-600 mb-2">流量问题</div>
                <p className="text-[13px] text-ink-soft leading-relaxed">{diagnosis.issues.traffic}</p>
              </div>
              <div className="panel p-4 border-t-2 border-amber-400">
                <div className="text-[11px] font-bold uppercase text-amber-600 mb-2">互动问题</div>
                <p className="text-[13px] text-ink-soft leading-relaxed">{diagnosis.issues.engagement}</p>
              </div>
              <div className="panel p-4 border-t-2 border-emerald-400">
                <div className="text-[11px] font-bold uppercase text-emerald-600 mb-2">转化问题</div>
                <p className="text-[13px] text-ink-soft leading-relaxed">{diagnosis.issues.conversion}</p>
              </div>
            </div>

            {/* Platform diagnosis */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="panel p-5">
                <div className="flex items-center gap-2 mb-2"><PlatformBadge platform="抖音" /><span className="text-[13px] font-bold text-ink">抖音诊断</span></div>
                <p className="text-[13px] text-ink-soft leading-relaxed">{diagnosis.platformDiagnosis["抖音"]}</p>
              </div>
              <div className="panel p-5">
                <div className="flex items-center gap-2 mb-2"><PlatformBadge platform="小红书" /><span className="text-[13px] font-bold text-ink">小红书诊断</span></div>
                <p className="text-[13px] text-ink-soft leading-relaxed">{diagnosis.platformDiagnosis["小红书"]}</p>
              </div>
            </div>

            {/* Root cause */}
            <div className="panel p-5">
              <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-coral-500" /><span className="text-[13px] font-bold text-ink">根本原因</span></div>
              <p className="text-[13px] text-ink-soft leading-relaxed whitespace-pre-line">{diagnosis.rootCause}</p>
            </div>

            {/* Optimization */}
            <div className="panel p-5">
              <div className="flex items-center gap-2 mb-3"><Zap size={16} className="text-brand-500" /><span className="text-[13px] font-bold text-ink">优化方向</span></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] font-bold uppercase text-muted-light mb-1">内容方向</div>
                  <p className="text-[13px] text-ink-soft">{diagnosis.optimizationDirection.contentAngle}</p>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-muted-light mb-1">用户心理</div>
                  <p className="text-[13px] text-ink-soft">{diagnosis.optimizationDirection.userPsychology}</p>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-muted-light mb-1">平台适配</div>
                  <p className="text-[13px] text-ink-soft">{diagnosis.optimizationDirection.platformFit}</p>
                </div>
              </div>
            </div>

            <button className="button-secondary text-xs" onClick={() => { setDiagnosis(null); }} type="button">重新诊断</button>
          </>
        ) : null}
      </section>
    </div>
  );
}
