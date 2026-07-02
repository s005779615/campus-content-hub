"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, Brain, Check, CheckCircle2, Images, Loader2, Save, Sparkles, WandSparkles, Zap } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { ContentOutput } from "@/components/content-output";
import { RiskAlert } from "@/components/risk-alert";
import { contentGoals, contentTypes, platforms, toneStyles } from "@/lib/constants";
import type { AiProviderStatus, FriendlyModelInfo } from "@/lib/content-generator";
import type {
  CampusAsset,
  GeneratePayload,
  GeneratedOutput,
  Platform,
  RiskHit,
  SchoolRecord,
  SelectedAssetSummary,
  TaskRecord
} from "@/lib/types";

type GenerationState = {
  payload: GeneratePayload;
  output: GeneratedOutput;
  riskHits: RiskHit[];
  selectedAssets: SelectedAssetSummary[];
};

const fallbackModel = "doubao-seed-2-0-lite-260215";

export function GenerateClient({
  aiStatus,
  assets,
  schools,
  initialTask
}: {
  aiStatus: AiProviderStatus;
  assets: CampusAsset[];
  schools: SchoolRecord[];
  initialTask: TaskRecord | null;
}) {
  const router = useRouter();
  const models = aiStatus.models.length > 0 ? aiStatus.models : [];
  const defaultModel =
    models.find((model) => model.id === aiStatus.model)?.id ??
    models.find((model) => model.id === fallbackModel)?.id ??
    models[0]?.id ??
    fallbackModel;
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [payload, setPayload] = useState<GeneratePayload>({
    schoolId: initialTask?.school_id ?? schools[0]?.id ?? "",
    platform: initialTask?.platform ?? "小红书",
    contentType: initialTask?.content_type ?? contentTypes[0],
    contentGoal: "私信咨询",
    tone: "真实学长学姐口吻",
    model: defaultModel,
    taskId: initialTask?.id,
    assetIds: []
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
  const availableAssets = useMemo(
    () => assets.filter((asset) => asset.school_id === payload.schoolId),
    [assets, payload.schoolId]
  );
  const selectedAssets = useMemo(
    () =>
      assets
        .filter((asset) => payload.assetIds?.includes(asset.id))
        .map(({ id, file_name, file_type, category, tags, location, usage_scene }) => ({
          id,
          file_name,
          file_type,
          category,
          tags,
          location,
          usage_scene
        })),
    [assets, payload.assetIds]
  );

  const currentModelInfo = useMemo(
    () => models.find(m => m.id === selectedModel),
    [models, selectedModel]
  );

  // 智能推荐：根据内容类型+语气+平台推荐最合适的模型
  const recommendedModel = useMemo(() => {
    const { platform, contentType, tone } = payload;
    // 校园生活类 → 豆包（种草测评基因）
    const campusLife = ["吃喝玩乐", "宿舍攻略", "新生开学", "被子生活用品"];
    // 深度分析类 → DeepSeek Pro（推理能力）
    const deepAnalysis = ["校园避坑", "兼职"];
    // 强转化/避坑口吻 → DeepSeek Pro
    const deepTone = ["强转化口吻", "避坑攻略口吻"];
    // 小红书种草 → 豆包
    if (platform === "小红书" && campusLife.includes(contentType)) return "doubao-seed-2-0-lite-260215";
    // 深度内容 → DeepSeek Pro
    if (deepAnalysis.includes(contentType) || deepTone.includes(tone)) return "deepseek-v4-pro-260425";
    // 抖音/视频号 + 清单类 → 极速版
    if ((platform === "抖音" || platform === "视频号") && ["校园卡", "被子生活用品"].includes(contentType)) return "doubao-seed-2-0-lite-260215";
    // 校园生活默认 → 豆包
    if (campusLife.includes(contentType)) return "doubao-seed-2-0-lite-260215";
    // 其余 → DeepSeek Pro
    return "deepseek-v4-pro-260425";
  }, [payload.platform, payload.contentType, payload.tone]);

  const recModelInfo = useMemo(
    () => models.find(m => m.id === recommendedModel),
    [models, recommendedModel]
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

    let response: Response;
    try {
      response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, model: selectedModel })
      });
    } catch (error) {
      setLoading(false);
      setMessage(friendlyGenerateError(error));
      setMessageType("error");
      return;
    }

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const errMsg = typeof data.error === "string" ? data.error : (data.error?.message || data.error?.code || "生成失败，请稍后重试。");
      setMessage(friendlyGenerateError(errMsg));
      setMessageType("error");
      return;
    }

    const data = (await response.json()) as {
      output: GeneratedOutput;
      riskHits: RiskHit[];
      selectedAssets: SelectedAssetSummary[];
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
      selectedAssets: Array.isArray(data.selectedAssets) ? data.selectedAssets : selectedAssets
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
      const errMsg = typeof data.error === "string" ? data.error : (data.error?.message || "保存失败。");
      setMessage(String(errMsg));
      setMessageType("error");
      return;
    }

    setMessage(initialTask ? "内容已保存，任务进入“已生成”。" : "内容已保存到内容库。");
    setMessageType("info");
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="panel p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-ink">生成参数</h2>
        {initialTask ? (
          <p className="mt-2 rounded-lg bg-canvas-alt px-3 py-2 text-sm text-muted">
            正在处理任务：{initialTask.content_type} · {initialTask.platform}
          </p>
        ) : null}
        <AiStatusBanner status={aiStatus} />

        {/* ── 模型选择器 ── */}
        {models.length > 1 ? (
          <div className="mt-5 border-y border-line py-4">
            <div className="mb-3 flex items-center gap-2">
              <Brain size={15} strokeWidth={1.7} className="text-muted" />
              <span className="text-xs font-semibold text-muted">
                选择创作引擎
              </span>
            </div>
            <div className="grid gap-2">
              {models.map((model) => (
                <ModelOption
                  key={model.id}
                  model={model}
                  selected={selectedModel === model.id}
                  recommended={model.id === recommendedModel && model.id !== selectedModel}
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
                setPayload((current) => ({
                  ...current,
                  schoolId: event.target.value,
                  assetIds: []
                }))
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
                {platforms.map((platform) => (
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
            <div className="rounded-md border border-line bg-canvas-alt p-3 text-sm leading-6 text-muted">
              <span className="text-xs font-semibold text-muted-light">学校资料预览 · </span>
              {selectedSchool.city} ·{" "}
              {selectedSchool.dormitory_info || selectedSchool.registration_notes || "资料较少，建议先补充学校信息"}
            </div>
          ) : null}

          <div className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-ink">选择素材</p>
                <p className="mt-1 text-xs text-muted">
                  仅显示当前学校已审核通过、可用于生成的素材。
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted">
                已选 {payload.assetIds?.length ?? 0}
              </span>
            </div>
            {availableAssets.length ? (
              <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                {availableAssets.map((asset) => {
                  const selected = payload.assetIds?.includes(asset.id) ?? false;
                  return (
                    <button
                      key={asset.id}
                      className={[
                        "group relative overflow-hidden rounded-md border text-left transition-colors",
                        selected
                          ? "border-brand-700 ring-1 ring-brand-700"
                          : "border-line hover:border-brand-400"
                      ].join(" ")}
                      onClick={() =>
                        setPayload((current) => {
                          const currentIds = current.assetIds ?? [];
                          return {
                            ...current,
                            assetIds: selected
                              ? currentIds.filter((id) => id !== asset.id)
                              : currentIds.length >= 8
                                ? currentIds
                                : [...currentIds, asset.id]
                          };
                        })
                      }
                      type="button"
                    >
                      <div className="aspect-square bg-canvas-alt">
                        {asset.signed_url ? (
                          asset.file_type === "视频" ? (
                            <video
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                              src={asset.signed_url}
                            />
                          ) : (
                            <img
                              alt={asset.file_name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              src={asset.signed_url}
                            />
                          )
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-light">
                            <Images size={20} />
                          </div>
                        )}
                      </div>
                      <div className="truncate px-2 py-2 text-[11px] font-medium text-ink">
                        {asset.file_name}
                      </div>
                      {selected ? (
                        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-900 text-white">
                          <Check size={13} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 rounded-md bg-canvas-alt px-3 py-4 text-center text-xs text-muted">
                当前学校暂无已通过素材，可先到校园素材库上传。
              </div>
            )}
            {availableAssets.length > 8 ? (
              <p className="mt-2 text-[11px] text-muted-light">一次最多选择 8 个素材。</p>
            ) : null}
          </div>

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
            <SelectedAssetsPanel assets={result.selectedAssets} />
            <button className="button-primary" disabled={saving} onClick={saveContent} type="button">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              保存到内容库
            </button>
          </>
        ) : (
          <div className="panel flex min-h-[420px] items-center justify-center p-8 text-center">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-line bg-canvas-alt text-muted">
                <WandSparkles size={22} strokeWidth={1.7} />
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

function friendlyGenerateError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();

  if (
    lower.includes("aborted") ||
    lower.includes("abort") ||
    lower.includes("timeout") ||
    lower.includes("timed out")
  ) {
    return "AI 生成超时或被中断。建议少选几个素材，或切换另一个创作引擎再试一次。";
  }

  return message || "生成失败，请稍后重试。";
}

function SelectedAssetsPanel({ assets }: { assets: SelectedAssetSummary[] }) {
  if (!assets.length) {
    return null;
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2">
        <Images size={16} className="text-muted" />
        <h3 className="text-sm font-semibold text-ink">本次所选素材</h3>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {assets.map((asset) => (
          <span key={asset.id} className="badge bg-canvas-alt text-muted">
            {asset.file_name} · {asset.category}
          </span>
        ))}
      </div>
    </div>
  );
}

/** ── 模型选项卡片 ── */
function ModelOption({
  model,
  selected,
  recommended,
  onSelect
}: {
  model: FriendlyModelInfo;
  selected: boolean;
  recommended: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(model.id)}
      className={`w-full rounded-md border p-3 text-left transition-colors duration-150 ${
        selected
          ? "border-brand-700 bg-white ring-1 ring-brand-700"
          : recommended
            ? "border-brand-300 bg-canvas-alt hover:border-brand-500"
            : "border-line bg-white hover:border-brand-400"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
            selected ? "bg-brand-900 text-white" : recommended ? "bg-brand-100 text-brand-700" : "bg-canvas-alt text-muted-light"
          }`}
        >
          {model.id.includes("deepseek") && model.id.includes("pro") ? (
            <Zap size={18} />
          ) : model.id.includes("deepseek") && model.id.includes("flash") ? (
            <Zap size={18} />
          ) : model.id.includes("template") ? (
            <AlertCircle size={18} />
          ) : (
            <Sparkles size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-semibold text-ink">{model.displayName}</h4>
            {selected ? (
              <span className="inline-flex items-center gap-1 rounded bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                <CheckCircle2 size={10} />
                使用中
              </span>
            ) : recommended ? (
              <span className="inline-flex items-center gap-1 rounded bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                <Sparkles size={10} />
                推荐
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-5 text-muted-light line-clamp-2">
            {model.description}
          </p>
          {recommended && !selected ? (
            <p className="mt-1 text-[10px] font-medium text-muted">根据当前参数智能推荐</p>
          ) : null}
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
