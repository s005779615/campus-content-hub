"use client";

import {
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Route,
  Send,
  Target,
  Users,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PlatformBadge } from "@/components/platform-badge";
import type { PlatformAccount, SchoolRecord } from "@/lib/types";

type PlanRecord = {
  id: string;
  created_at: string;
  schools?: { name: string; campus_name: string | null };
};

type SocialStat = {
  platform: string;
  accountCount: number;
  publishCount: number;
  exposure: number;
  plays: number;
  likes: number;
  favorites: number;
  comments: number;
  privateMessages: number;
  groups: number;
  leads: number;
  deals: number;
};

type PositioningProfile = {
  accountId?: string;
  platform?: string;
  accountName?: string;
  owner?: string;
  accountPersona?: string;
  targetStudents?: string;
  mainGoal?: string;
  secondaryGoal?: string;
  contentDirections?: string[];
  recommendedFormats?: string[];
  publishFrequency?: string;
  publishTimeSlots?: string[];
  trafficPath?: string;
  differentiation?: string;
  positioningReason?: string;
};

type PositioningResult = {
  accounts?: PositioningProfile[];
  matrixSummary?: string;
};

type DiagnosticResult = {
  coreProblem?: string;
  trafficProblem?: string;
  engagementProblem?: string;
  privateMessageProblem?: string;
  groupProblem?: string;
  conversionProblem?: string;
  dataAnomalies?: string[];
  topPriority?: string;
};

type StrategyResult = {
  cycle?: {
    startDate?: string;
    endDate?: string;
    mode?: string;
    school?: string;
    campus?: string;
    stage?: string;
    stageReason?: string;
  };
  accounts?: Array<{
    accountId?: string;
    accountName?: string;
    platform?: string;
    accountPositioning?: string;
    currentStage?: string;
    cycleCoreGoal?: string;
    weeklyReason?: string;
    dataTargets?: Record<string, string>;
    days?: Array<{
      date?: string;
      platform?: string;
      publishTimeSlot?: string;
      contentType?: string;
      contentDirection?: string;
      publishFrequency?: string;
      trafficMethod?: string;
      targetAudience?: string;
      operationGoal?: string;
      reason?: string;
    }>;
  }>;
  taskParams?: Array<{
    school?: string;
    campus?: string;
    accountId?: string;
    accountName?: string;
    platform?: string;
    accountPositioning?: string;
    contentDirection?: string;
    contentType?: string;
    publishTime?: string;
    targetAudience?: string;
    operationGoal?: string;
  }>;
  riskReminders?: string[];
};

type OperationTab = "positioning" | "diagnostic" | "strategy" | "tasks";

const steps = ["账号定位", "数据诊断", "7天运营策略", "内容与任务"] as const;
const tabs: Array<{ id: OperationTab; label: string }> = [
  { id: "positioning", label: "账号定位" },
  { id: "diagnostic", label: "诊断结果" },
  { id: "strategy", label: "运营策略" },
  { id: "tasks", label: "任务分配" }
];

const platforms = ["小红书", "抖音", "视频号"];
const defaultSocialStats: SocialStat[] = platforms.map((platform) => ({
  platform,
  accountCount: 0,
  publishCount: 0,
  exposure: 0,
  plays: 0,
  likes: 0,
  favorites: 0,
  comments: 0,
  privateMessages: 0,
  groups: 0,
  leads: 0,
  deals: 0
}));

export function OperationsClient({
  schools,
  platformAccounts
}: {
  profile: { role: string };
  schools: SchoolRecord[];
  initialPlans: PlanRecord[];
  platformAccounts: PlatformAccount[];
}) {
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [semesterStart, setSemesterStart] = useState("");
  const [newStudents, setNewStudents] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [competitorCount, setCompetitorCount] = useState("");
  const [historicalDirections, setHistoricalDirections] = useState("");
  const [executedThemes, setExecutedThemes] = useState("");
  const [socialStats, setSocialStats] = useState<SocialStat[]>(defaultSocialStats);
  const [accounts, setAccounts] = useState<PlatformAccount[]>(platformAccounts);
  const [positioning, setPositioning] = useState<PositioningResult | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [strategy, setStrategy] = useState<StrategyResult | null>(null);
  const [syncedPayload, setSyncedPayload] = useState<StrategyResult["taskParams"]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState<OperationTab>("positioning");
  const [loadingAction, setLoadingAction] = useState("");
  const [message, setMessage] = useState("");

  const selectedSchool = schools.find((school) => school.id === selectedSchoolId);
  const visibleAccounts = useMemo(
    () => accounts.filter((account) => account.school_id === selectedSchoolId),
    [accounts, selectedSchoolId]
  );
  const confirmedCount = visibleAccounts.filter(
    (account) => account.positioning_status === "已确认"
  ).length;

  useEffect(() => {
    if (!selectedSchoolId) return;
    void loadAccounts(selectedSchoolId);
  }, [selectedSchoolId]);

  async function loadAccounts(schoolId: string) {
    const response = await fetch(`/api/operations/account-positioning?schoolId=${schoolId}`);
    const data = await response.json();
    if (response.ok) {
      setAccounts((previous) => [
        ...previous.filter((account) => account.school_id !== schoolId),
        ...(data.accounts ?? [])
      ]);
    } else {
      setMessage(data.error ?? "账号读取失败");
    }
  }

  async function runPositioning(mode: "single" | "matrix", accountId?: string) {
    if (!selectedSchoolId) return setMessage("请先选择学校。");
    setLoadingAction(accountId ? `single-${accountId}` : mode);
    setMessage("");
    try {
      const data = await postJson<{ positioning: PositioningResult }>(
        "/api/operations/account-positioning",
        { schoolId: selectedSchoolId, accountId, mode }
      );
      setPositioning(data.positioning);
      setActiveStep(0);
      setActiveTab("positioning");
      await loadAccounts(selectedSchoolId);
      setMessage("账号定位已生成，请确认后保存。");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  async function confirmPositioning() {
    if (!selectedSchoolId) return setMessage("请先选择学校。");
    const generated = positioning?.accounts ?? [];
    const fromAccounts = visibleAccounts
      .filter((account) => account.positioning_profile && Object.keys(account.positioning_profile).length)
      .map((account) => ({
        accountId: account.id,
        profile: account.positioning_profile as Record<string, unknown>
      }));
    const positions = generated.length
      ? generated.map((profile) => ({ accountId: profile.accountId ?? "", profile: profile as Record<string, unknown> }))
      : fromAccounts;

    if (!positions.length) return setMessage("请先生成账号定位。");
    setLoadingAction("confirm-positioning");
    try {
      await postJson("/api/operations/account-positioning", { schoolId: selectedSchoolId, positions }, "PATCH");
      await loadAccounts(selectedSchoolId);
      setMessage("账号定位已确认保存，后续诊断和策略会读取已确认定位。");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  async function runDiagnostic() {
    if (!selectedSchoolId || !selectedSchool) return setMessage("请先选择学校。");
    setLoadingAction("diagnostic");
    setMessage("");
    try {
      const data = await postJson<{ diagnostic: DiagnosticResult }>("/api/operations/diagnostic", {
        schoolId: selectedSchoolId,
        school: schoolPayload(),
        socialStats: effectiveStats()
      });
      setDiagnostic(data.diagnostic);
      setActiveStep(1);
      setActiveTab("diagnostic");
      setMessage("账号诊断已保存。");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  async function runStrategy(mode: "generate" | "adjust" | "next") {
    if (!selectedSchoolId || !selectedSchool) return setMessage("请先选择学校。");
    if (!semesterStart) return setMessage("请先填写开学日期。");
    setLoadingAction(`strategy-${mode}`);
    setMessage("");
    try {
      const data = await postJson<{ strategy: StrategyResult }>("/api/operations/strategy", {
        schoolId: selectedSchoolId,
        school: schoolPayload(),
        mode,
        socialStats: effectiveStats(),
        historicalDirections: splitLines(historicalDirections),
        executedThemes: splitLines(executedThemes),
        previousStrategy: mode === "generate" ? null : strategy,
        diagnosis: diagnostic
      });
      setStrategy(data.strategy);
      setSyncedPayload([]);
      setActiveStep(2);
      setActiveTab("strategy");
      setMessage("未来7天运营策略已生成并保存。");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  async function saveStrategy() {
    if (!selectedSchoolId || !strategy) return setMessage("暂无可保存策略。");
    setLoadingAction("save-strategy");
    try {
      await postJson("/api/operations/strategy/save", { schoolId: selectedSchoolId, strategy });
      setMessage("本期策略已保存。");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  async function syncToContentGeneration() {
    const payload = strategy?.taskParams ?? [];
    if (!payload.length) return setMessage("当前策略没有可同步的任务参数。");
    setSyncedPayload(payload);
    setActiveStep(3);
    setActiveTab("tasks");
    await navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => undefined);
    setMessage("已生成内容模块任务参数，并复制到剪贴板。");
  }

  async function assignTasks() {
    if (!selectedSchoolId || !strategy) return setMessage("请先生成7天运营策略。");
    setLoadingAction("assign-tasks");
    try {
      const data = await postJson<{ tasks: unknown[] }>("/api/operations/strategy/tasks", {
        schoolId: selectedSchoolId,
        strategy
      });
      setActiveStep(3);
      setActiveTab("tasks");
      setMessage(`已分配 ${data.tasks.length} 条发布任务。`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  function schoolPayload() {
    return {
      name: selectedSchool?.name,
      campusName: selectedSchool?.campus_name,
      totalStudents,
      newStudents,
      semesterStart
    };
  }

  function effectiveStats() {
    return socialStats.filter((item) =>
      item.accountCount ||
      item.publishCount ||
      item.exposure ||
      item.plays ||
      item.likes ||
      item.favorites ||
      item.comments ||
      item.privateMessages ||
      item.groups ||
      item.leads ||
      item.deals
    );
  }

  function updateStat(index: number, field: keyof SocialStat, value: string) {
    setSocialStats((previous) =>
      previous.map((item, currentIndex) =>
        currentIndex === index
          ? { ...item, [field]: field === "platform" ? value : Number(value) || 0 }
          : item
      )
    );
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-2 md:grid-cols-4">
        {steps.map((step, index) => (
          <button
            key={step}
            className={`flex items-center gap-3 border px-4 py-3 text-left text-sm ${
              activeStep === index
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-line bg-white text-ink-soft"
            }`}
            onClick={() => {
              setActiveStep(index);
              setActiveTab(tabs[index]?.id ?? "positioning");
            }}
            type="button"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas text-xs font-bold">
              {index + 1}
            </span>
            <span className="font-semibold">{step}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="panel space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-sm font-bold text-ink">校区数据输入</h2>
            <p className="mt-1 text-xs text-muted">保留学校、开学时间和平台数据，供每一步独立调用。</p>
          </div>

          <select className="form-input" value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)}>
            <option value="">选择学校/校区</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}{school.campus_name ? ` · ${school.campus_name}` : ""}
              </option>
            ))}
          </select>

          <div className="grid gap-2 sm:grid-cols-2">
            <input className="form-input" min={0} placeholder="新生人数" type="number" value={newStudents || ""} onChange={(event) => setNewStudents(Number(event.target.value))} />
            <input className="form-input" min={0} placeholder="总学生人数" type="number" value={totalStudents || ""} onChange={(event) => setTotalStudents(Number(event.target.value))} />
          </div>
          <input className="form-input" type="date" value={semesterStart} onChange={(event) => setSemesterStart(event.target.value)} />
          <input className="form-input" min={0} placeholder="竞争团队数量" type="number" value={competitorCount} onChange={(event) => setCompetitorCount(event.target.value)} />

          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase text-muted-light">平台数据</div>
            {socialStats.map((stat, index) => (
              <div key={stat.platform} className="space-y-2 border border-line/60 p-3">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={stat.platform} />
                  <input className="form-input w-20 py-1 text-xs" placeholder="账号数" type="number" value={stat.accountCount || ""} onChange={(event) => updateStat(index, "accountCount", event.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    ["publishCount", "发布"],
                    ["exposure", "曝光"],
                    ["plays", "播放"],
                    ["likes", "赞"],
                    ["favorites", "藏"],
                    ["comments", "评"],
                    ["privateMessages", "私信"],
                    ["groups", "进群"],
                    ["leads", "留资"],
                    ["deals", "成交"]
                  ].map(([field, label]) => (
                    <input
                      key={field}
                      className="form-input px-2 py-1 text-[11px]"
                      placeholder={label}
                      type="number"
                      value={stat[field as keyof SocialStat] || ""}
                      onChange={(event) => updateStat(index, field as keyof SocialStat, event.target.value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <textarea className="form-input min-h-20" placeholder="历史发布方向，一行一个" value={historicalDirections} onChange={(event) => setHistoricalDirections(event.target.value)} />
          <textarea className="form-input min-h-20" placeholder="已执行主题，一行一个" value={executedThemes} onChange={(event) => setExecutedThemes(event.target.value)} />

          {message ? <div className="bg-canvas-alt p-3 text-sm text-ink-soft">{message}</div> : null}
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 text-sm font-semibold ${
                  activeTab === tab.id ? "bg-ink text-white" : "bg-white text-ink-soft"
                }`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "positioning" ? (
            <PositioningPanel
              accounts={visibleAccounts}
              confirmedCount={confirmedCount}
              loadingAction={loadingAction}
              positioning={positioning}
              onGenerate={() => runPositioning("single")}
              onMatrix={() => runPositioning("matrix")}
              onConfirm={confirmPositioning}
              onSingle={(accountId) => runPositioning("single", accountId)}
            />
          ) : null}

          {activeTab === "diagnostic" ? (
            <DiagnosticPanel
              diagnostic={diagnostic}
              disabled={!selectedSchoolId || confirmedCount === 0}
              loading={loadingAction === "diagnostic"}
              onRun={runDiagnostic}
            />
          ) : null}

          {activeTab === "strategy" ? (
            <StrategyPanel
              strategy={strategy}
              loadingAction={loadingAction}
              onGenerate={() => runStrategy("generate")}
              onAdjust={() => runStrategy("adjust")}
              onNext={() => runStrategy("next")}
              onSave={saveStrategy}
              disabled={!selectedSchoolId || confirmedCount === 0}
            />
          ) : null}

          {activeTab === "tasks" ? (
            <TasksPanel
              strategy={strategy}
              syncedPayload={syncedPayload}
              loadingAction={loadingAction}
              onSync={syncToContentGeneration}
              onAssign={assignTasks}
              disabled={!strategy}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function PositioningPanel({
  accounts,
  confirmedCount,
  loadingAction,
  positioning,
  onGenerate,
  onMatrix,
  onConfirm,
  onSingle
}: {
  accounts: PlatformAccount[];
  confirmedCount: number;
  loadingAction: string;
  positioning: PositioningResult | null;
  onGenerate: () => void;
  onMatrix: () => void;
  onConfirm: () => void;
  onSingle: (accountId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ActionButton icon={Brain} loading={loadingAction === "single"} onClick={onGenerate}>AI生成账号定位</ActionButton>
        <ActionButton icon={Users} loading={loadingAction === "matrix"} onClick={onMatrix}>批量生成账号矩阵</ActionButton>
        <ActionButton icon={CheckCircle2} loading={loadingAction === "confirm-positioning"} onClick={onConfirm}>确认并保存定位</ActionButton>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {accounts.map((account) => {
          const profile = account.positioning_profile as PositioningProfile | undefined;
          return (
            <article key={account.id} className="border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={account.platform} />
                    <h3 className="font-semibold text-ink">{account.account_name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {personName(account.profiles)} · {account.positioning_status ?? "未确认"}
                  </p>
                </div>
                <button className="button-secondary text-xs" disabled={Boolean(loadingAction)} onClick={() => onSingle(account.id)} type="button">
                  {loadingAction === `single-${account.id}` ? <Loader2 className="animate-spin" size={13} /> : <Target size={13} />}
                  单账号重新定位
                </button>
              </div>
              <Definition label="账号人设" value={profile?.accountPersona} />
              <Definition label="目标学生群体" value={profile?.targetStudents} />
              <Definition label="主要目标" value={profile?.mainGoal} />
              <Definition label="辅助目标" value={profile?.secondaryGoal} />
              <Definition label="内容方向" value={profile?.contentDirections?.join(" / ")} />
              <Definition label="推荐形式" value={profile?.recommendedFormats?.join(" / ")} />
              <Definition label="频率与时间" value={`${profile?.publishFrequency ?? "待生成"} · ${(profile?.publishTimeSlots ?? []).join(" / ") || "待生成"}`} />
              <Definition label="引流路径" value={profile?.trafficPath} />
              <Definition label="差异化" value={profile?.differentiation} />
              <Definition label="定位理由" value={profile?.positioningReason} />
            </article>
          );
        })}
      </div>

      {!accounts.length ? <Empty text="选择学校后自动读取该校区已收集账号。" /> : null}
      {positioning?.matrixSummary ? (
        <div className="border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
          {positioning.matrixSummary}
        </div>
      ) : null}
      {accounts.length ? <p className="text-sm text-muted">已确认 {confirmedCount} / {accounts.length} 个账号定位。</p> : null}
    </div>
  );
}

function DiagnosticPanel({
  diagnostic,
  disabled,
  loading,
  onRun
}: {
  diagnostic: DiagnosticResult | null;
  disabled: boolean;
  loading: boolean;
  onRun: () => void;
}) {
  return (
    <div className="space-y-4">
      <ActionButton disabled={disabled} icon={Zap} loading={loading} onClick={onRun}>运行账号诊断</ActionButton>
      {diagnostic ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ResultBlock icon={Brain} title="核心问题" value={diagnostic.coreProblem} />
          <ResultBlock icon={Target} title="最优先解决" value={diagnostic.topPriority} />
          <ResultBlock title="流量问题" value={diagnostic.trafficProblem} />
          <ResultBlock title="互动问题" value={diagnostic.engagementProblem} />
          <ResultBlock title="私信问题" value={diagnostic.privateMessageProblem} />
          <ResultBlock title="进群问题" value={diagnostic.groupProblem} />
          <ResultBlock title="转化问题" value={diagnostic.conversionProblem} />
          <ResultBlock title="数据异常" value={diagnostic.dataAnomalies?.join(" / ")} />
        </div>
      ) : (
        <Empty text="确认账号定位后，再运行轻量账号诊断。" />
      )}
    </div>
  );
}

function StrategyPanel({
  strategy,
  loadingAction,
  disabled,
  onGenerate,
  onAdjust,
  onNext,
  onSave
}: {
  strategy: StrategyResult | null;
  loadingAction: string;
  disabled: boolean;
  onGenerate: () => void;
  onAdjust: () => void;
  onNext: () => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ActionButton disabled={disabled} icon={CalendarDays} loading={loadingAction === "strategy-generate"} onClick={onGenerate}>生成未来7天运营方向</ActionButton>
        <ActionButton disabled={disabled} icon={Route} loading={loadingAction === "strategy-adjust"} onClick={onAdjust}>根据最新数据调整策略</ActionButton>
        <ActionButton disabled={disabled} icon={Send} loading={loadingAction === "strategy-next"} onClick={onNext}>继续生成下一周期</ActionButton>
        <ActionButton disabled={!strategy} icon={CheckCircle2} loading={loadingAction === "save-strategy"} onClick={onSave}>保存本期策略</ActionButton>
      </div>

      {strategy ? (
        <div className="space-y-4">
          <div className="border border-line bg-white p-5">
            <p className="text-sm font-semibold text-ink">
              {strategy.cycle?.startDate ?? "-"} 至 {strategy.cycle?.endDate ?? "-"} · {strategy.cycle?.stage ?? "阶段未返回"}
            </p>
            <p className="mt-2 text-sm text-muted">{strategy.cycle?.stageReason}</p>
          </div>
          {strategy.accounts?.map((account, index) => (
            <article key={`${account.accountId ?? index}`} className="border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge platform={account.platform ?? ""} />
                <h3 className="font-semibold text-ink">{account.accountName ?? "未命名账号"}</h3>
                <span className="text-sm text-muted">{account.accountPositioning}</span>
              </div>
              <Definition label="本周期核心目标" value={account.cycleCoreGoal} />
              <Definition label="安排原因" value={account.weeklyReason} />
              <div className="mt-4 grid gap-3">
                {account.days?.map((day, dayIndex) => (
                  <div key={`${day.date}-${dayIndex}`} className="border border-line/70 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                      <span>{day.date}</span>
                      <PlatformBadge platform={day.platform ?? account.platform ?? ""} />
                      <span>{day.publishTimeSlot}</span>
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">{day.contentType} · {day.contentDirection}</p>
                    <p className="mt-1 text-xs text-muted">{day.operationGoal} · {day.targetAudience} · {day.reason}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty text="先完成账号定位和诊断，再生成未来7天策略。" />
      )}
    </div>
  );
}

function TasksPanel({
  strategy,
  syncedPayload,
  loadingAction,
  disabled,
  onSync,
  onAssign
}: {
  strategy: StrategyResult | null;
  syncedPayload: StrategyResult["taskParams"];
  loadingAction: string;
  disabled: boolean;
  onSync: () => void;
  onAssign: () => void;
}) {
  const payload = syncedPayload?.length ? syncedPayload : strategy?.taskParams ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <ActionButton disabled={disabled} icon={ClipboardList} onClick={onSync}>同步到内容生成</ActionButton>
        <ActionButton disabled={disabled} icon={Users} loading={loadingAction === "assign-tasks"} onClick={onAssign}>分配给团队成员</ActionButton>
      </div>

      {payload?.length ? (
        <div className="grid gap-3">
          {payload.map((item, index) => (
            <article key={`${item.accountId ?? index}-${item.publishTime ?? index}`} className="border border-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge platform={item.platform ?? ""} />
                <span className="font-semibold text-ink">{item.accountName}</span>
                <span className="text-sm text-muted">{item.publishTime}</span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{item.contentType} · {item.contentDirection}</p>
              <p className="mt-1 text-xs text-muted">{item.targetAudience} · {item.operationGoal}</p>
            </article>
          ))}
        </div>
      ) : (
        <Empty text="生成7天策略后，可同步任务参数或分配任务。" />
      )}
    </div>
  );
}

function Definition({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mt-3">
      <dt className="text-[11px] font-bold uppercase text-muted-light">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-ink-soft">{value || "待生成"}</dd>
    </div>
  );
}

function ResultBlock({
  icon: Icon,
  title,
  value
}: {
  icon?: typeof Brain;
  title: string;
  value?: string | null;
}) {
  return (
    <article className="border border-line bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        {Icon ? <Icon size={16} className="text-brand-500" /> : null}
        {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{value || "数据未提供"}</p>
    </article>
  );
}

function ActionButton({
  children,
  disabled,
  icon: Icon,
  loading,
  onClick
}: {
  children: React.ReactNode;
  disabled?: boolean;
  icon: typeof Brain;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button className="button-primary text-xs" disabled={disabled || loading} onClick={onClick} type="button">
      {loading ? <Loader2 className="animate-spin" size={14} /> : <Icon size={14} />}
      {children}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="border border-dashed border-line bg-white p-10 text-center text-sm text-muted">{text}</div>;
}

async function postJson<T = any>(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data as T;
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function personName(profile: PlatformAccount["profiles"]) {
  if (!profile) return "未分配负责人";
  if (Array.isArray(profile)) {
    const first = profile[0] as any;
    return first?.full_name || first?.email || "未分配负责人";
  }
  return profile.full_name || profile.email || "未分配负责人";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败";
}
