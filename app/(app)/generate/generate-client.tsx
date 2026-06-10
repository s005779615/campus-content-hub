"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Brain, CheckCircle2, Loader2, Save, Sparkles, WandSparkles, Zap } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { ContentOutput } from "@/components/content-output";
import { RiskAlert } from "@/components/risk-alert";
import { contentGoals, contentTypes, mvpPlatforms, toneStyles } from "@/lib/constants";
import type { AiProviderStatus, FriendlyModelInfo } from "@/lib/content-generator";
import type {
  GeneratePayload,
  GeneratedOutput,
  Platform,
  RiskHit,
  SchoolRecord
} from "@/lib/types";

type GenerationState = {
  payload: GeneratePayload;
  output: GeneratedOutput;
  riskHits: RiskHit[];
};

const defaultModel = "deepseek-v4-pro-260425";

export function GenerateClient({
  aiStatus,
  schools
}: {
  aiStatus: AiProviderStatus;
  schools: SchoolRecord[];
}) {
  const router = useRouter();
  const models = aiStatus.models.length > 0 ? aiStatus.models : [];
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [payload, setPayload] = useState<GeneratePayload>({
    schoolId: schools[0]?.id ?? "",
    platform: "小红书",
    contentType: "新生避坑",
    contentGoal: "私信咨询",
    tone: "真实学长学姐口吻",
    model: defaultModel,
  });
  const [result, setResult] = useState<GenerationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error">("info");

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === payload.schoolId),
    [schools, payload.schoolId]
  );

  const currentModelInfo = useMemo(
    () => models.find(m => m.id === selectedModel),
    [models, selectedModel]
  );

  function handleModelChange(modelId: string) {
    setSelectedModel(modelId);
    setPayload((current) => ({ ...current, model: modelId }));
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType("info");

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, model: selectedModel })
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "生成失败，请稍后重试。");
      setMessageType("error");
      return;
    }

    const data = (await response.json()) as {
      output: GeneratedOutput;
      riskHits: RiskHit[];
    };

    // 防御：确保 output 有基本结构，防止渲染崩溃
    if (!data.output || typeof data.output !== "object") {
      setMessage("AI 返回内容格式异常，请切换模型或稍后重试。");
      setMessageType("error");
      return;
    }

    setResult({
      payload: { ...payload, model: selectedModel },
      output: data.output,
      riskHits: Array.isArray(data.riskHits) ? data.riskHits : [],
    });
  }

  async function saveContent() {
    if (!result) {
      return;
    }

    setSaving(true);
    setMessage("");
    setMessageType("info");

    const response = await fetch("/api/contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...result.payload,
        output: result.output,
        riskHits: result.riskHits
      })
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error ?? "保存失败。");
      setMessageType("error");
      return;
    }

    setMessage("内容已保存到内容库。");
    setMessageType("info");
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="panel p-5">
        <h2 className="text-sm font-bold text-ink">生成参数</h2>
        <AiStatusBanner status={aiStatus} />

        {/* ── 模型选择器 ── */}
        {models.length > 1 ? (
          <div className="mt-4 rounded-xl border border-line/60 bg-canvas-alt/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={15} className="text-brand-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-light">
                选择创作引擎
              </span>
            </div>
            <div className="grid gap-2">
              {models.map((model) => (
                <ModelOption
                  key={model.id}
                  model={model}
                  selected={selectedModel === model.id}
                  onSelect={handleModelChange}
                />
              ))}
            </div>
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={generate}>
          <label className="block">
            <span className="form-label">学校</span>
            <select
              className="form-input mt-1"
              value={payload.schoolId}
              onChange={(event) =>
                setPayload((current) => ({ ...current, schoolId: event.target.value }))
              }
              required
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {[school.name, school.campus_name].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="form-label">平台</span>
              <select
                className="form-input mt-1"
                value={payload.platform}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    platform: event.target.value as Platform
                  }))
                }
              >
                {mvpPlatforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="form-label">内容类型</span>
              <select
                className="form-input mt-1"
                value={payload.contentType}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    contentType: event.target.value
                  }))
                }
              >
                {contentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="form-label">内容目标</span>
              <select
                className="form-input mt-1"
                value={payload.contentGoal}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    contentGoal: event.target.value
                  }))
                }
              >
                {contentGoals.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="form-label">语气风格</span>
              <select
                className="form-input mt-1"
                value={payload.tone}
                onChange={(event) =>
                  setPayload((current) => ({
                    ...current,
                    tone: event.target.value
                  }))
                }
              >
                {toneStyles.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedSchool ? (
            <div className="rounded-lg border border-line/60 bg-canvas-alt/40 p-3 text-sm leading-6 text-muted">
              <span className="text-xs font-semibold text-muted-light">学校资料预览 · </span>
              {selectedSchool.city} ·{" "}
              {selectedSchool.dormitory_info || selectedSchool.registration_notes || "资料较少，建议先补充学校信息"}
            </div>
          ) : null}

          {message ? (
            <div
              className={[
                "rounded-lg border px-4 py-2.5 text-[13px] font-medium",
                messageType === "error"
                  ? "border-coral-100 bg-coral-50/70 text-coral-600"
                  : "border-line bg-white text-muted"
              ].join(" ")}
            >
              {message}
            </div>
          ) : null}

          <button className="button-primary w-full" disabled={loading} type="submit">
            {loading ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <>
                <WandSparkles size={17} />
                使用 {currentModelInfo?.displayName ?? "AI"} 生成
              </>
            )}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {result ? (
          <>
            <RiskAlert hits={result.riskHits} />
            <ContentOutput platform={result.payload.platform} output={result.output} />
            <button className="button-primary" disabled={saving} onClick={saveContent} type="button">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              保存到内容库
            </button>
          </>
        ) : (
          <div className="panel flex min-h-[420px] items-center justify-center p-8 text-center">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600">
                <WandSparkles size={26} />
              </div>
              <h2 className="mt-4 text-[15px] font-semibold text-ink">等待生成</h2>
              <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-muted">
                左侧选择学校、创作引擎和内容参数后，生成结果会显示在这里，便于复制发布。
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/** ── 模型选项卡片 ── */
function ModelOption({
  model,
  selected,
  onSelect
}: {
  model: FriendlyModelInfo;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(model.id)}
      className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
        selected
          ? "border-brand-200 bg-brand-50/70 ring-1 ring-brand-100 shadow-sm"
          : "border-line/60 bg-white hover:border-brand-100 hover:bg-brand-50/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            selected ? "bg-brand-100 text-brand-700" : "bg-canvas-alt text-muted-light"
          }`}
        >
          {model.id.includes("deepseek") ? (
            <Zap size={18} />
          ) : model.id.includes("template") ? (
            <AlertCircle size={18} />
          ) : (
            <Sparkles size={18} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-semibold text-ink">{model.displayName}</h4>
            {selected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                <CheckCircle2 size={10} />
                使用中
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-5 text-muted-light line-clamp-2">
            {model.description}
          </p>
        </div>
      </div>
    </button>
  );
}

function AiStatusBanner({ status }: { status: AiProviderStatus }) {
  const isTemplate = status.provider === "template";
  const isReady = !isTemplate && status.configured;

  if (isTemplate) {
    return (
      <div className="mt-3 rounded-lg border border-coral-100 bg-coral-50/70 px-4 py-2.5 text-[13px] font-medium text-coral-600">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <div>
            <p className="font-semibold">AI 引擎未配置</p>
            <p className="mt-0.5 text-coral-500/80">
              在 Vercel 环境变量中配置 DOUBAO_API_KEY 后重新部署即可激活。
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="mt-3 rounded-lg border border-coral-100 bg-coral-50/70 px-4 py-2.5 text-[13px] font-medium text-coral-600">
        AI 引擎密钥未配置
      </div>
    );
  }

  return null;
}
