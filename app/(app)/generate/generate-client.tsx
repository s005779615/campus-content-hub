"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Save, WandSparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { ContentOutput } from "@/components/content-output";
import { RiskAlert } from "@/components/risk-alert";
import { contentGoals, contentTypes, mvpPlatforms, toneStyles } from "@/lib/constants";
import type { AiProviderStatus } from "@/lib/content-generator";
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

export function GenerateClient({
  aiStatus,
  schools
}: {
  aiStatus: AiProviderStatus;
  schools: SchoolRecord[];
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<GeneratePayload>({
    schoolId: schools[0]?.id ?? "",
    platform: "小红书",
    contentType: "新生避坑",
    contentGoal: "私信咨询",
    tone: "真实学长学姐口吻"
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

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageType("info");

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
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
    setResult({
      payload: { ...payload },
      output: data.output,
      riskHits: data.riskHits
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
      <section className="panel p-4">
        <h2 className="text-sm font-semibold text-ink">生成参数</h2>
        <AiStatusBanner status={aiStatus} />
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
            <div className="rounded-md border border-line bg-canvas p-3 text-sm leading-6 text-muted">
              当前资料：{selectedSchool.city} ·{" "}
              {selectedSchool.dormitory_info || selectedSchool.registration_notes || "资料较少，建议先补充学校信息"}
            </div>
          ) : null}

          {message ? (
            <div
              className={[
                "rounded-md border px-3 py-2 text-sm",
                messageType === "error"
                  ? "border-coral-500/30 bg-coral-50 text-coral-600"
                  : "border-line bg-white text-muted"
              ].join(" ")}
            >
              {message}
            </div>
          ) : null}

          <button className="button-primary w-full" disabled={loading} type="submit">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
            生成内容
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <WandSparkles size={22} />
              </div>
              <h2 className="mt-3 text-sm font-semibold text-ink">等待生成</h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted">
                左侧选择学校和内容参数后，生成结果会显示在这里，便于复制发布。
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function AiStatusBanner({ status }: { status: AiProviderStatus }) {
  const isTemplate = status.provider === "template";
  const isReady = !isTemplate && status.configured;
  const Icon = isReady ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={[
        "mt-3 rounded-md border px-3 py-2 text-sm",
        isReady
          ? "border-brand-100 bg-brand-50 text-brand-800"
          : "border-coral-500/30 bg-coral-50 text-coral-600"
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 shrink-0" size={16} />
        <div className="min-w-0">
          <p className="font-medium">
            {isReady
              ? `${status.friendly.displayName} · 已激活`
              : isTemplate
                ? "当前使用本地模板"
                : "AI 引擎未配置"}
          </p>
          <p className="mt-1 leading-5">
            {isReady
              ? status.friendly.description
              : "要生成更真实、不重复的内容，请在 Vercel 环境变量中配置豆包 API Key 后重新部署。"}
          </p>
        </div>
      </div>
    </div>
  );
}
