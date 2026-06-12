import { Brain, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AvatarUpload } from "@/components/avatar-upload";
import { requireAuth } from "@/lib/auth";
import { riskTermSuggestions } from "@/lib/constants";
import { getAiProviderStatus } from "@/lib/content-generator";

export default async function SettingsPage() {
  const { profile } = await requireAuth();
  const aiStatus = getAiProviderStatus();
  const isActive = aiStatus.provider !== "template" && aiStatus.configured;

  return (
    <>
      <PageHeader
        title="设置"
        description="查看系统运行配置、内容安全边界和账号角色。"
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="panel p-5">
          <h2 className="text-sm font-bold text-ink">当前账号</h2>
          <div className="mt-4 border-b border-line/50 pb-4">
            <AvatarUpload url={profile.avatar_url ?? null} />
          </div>
          <dl className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-canvas-alt/60 px-4 py-3">
              <dt className="text-[13px] text-muted-light">邮箱</dt>
              <dd className="text-[13px] font-semibold text-ink">{profile.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-canvas-alt/60 px-4 py-3">
              <dt className="text-[13px] text-muted-light">姓名</dt>
              <dd className="text-[13px] font-semibold text-ink">{profile.full_name || "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-canvas-alt/60 px-4 py-3">
              <dt className="text-[13px] text-muted-light">角色</dt>
              <dd className="text-[13px] font-semibold text-ink">
                {profile.role === "admin" ? "管理员" : "队员"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-canvas-alt/60 px-4 py-3">
              <dt className="text-[13px] text-muted-light">AI 引擎状态</dt>
              <dd>
                <span
                  className={`badge ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "bg-coral-50 text-coral-600"
                  }`}
                >
                  {isActive ? "已激活" : "未配置"}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <ShieldCheck size={15} />
            </div>
            <h2 className="text-sm font-bold text-ink">内容审核规则</h2>
          </div>
          <div className="divide-y divide-line/50">
            {Object.entries(riskTermSuggestions).map(([term, suggestion]) => (
              <div key={term} className="grid gap-2 px-5 py-3.5 text-sm sm:grid-cols-[0.7fr_1.3fr]">
                <div className="text-[13px] font-semibold text-coral-700">禁止：「{term}」</div>
                <div className="text-[13px] text-muted">建议：「{suggestion}」</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel mt-5 overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-line/50 bg-canvas-alt/30 px-5 py-3.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Brain size={15} />
          </div>
          <h2 className="text-sm font-bold text-ink">AI 创作引擎</h2>
          {isActive ? (
            <span className="ml-auto badge bg-brand-50 text-brand-700">
              <Sparkles size={11} />
              已激活
            </span>
          ) : (
            <span className="ml-auto badge bg-coral-50 text-coral-600">
              未配置
            </span>
          )}
        </div>

        <div className="p-5">
          {isActive ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-line bg-white p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-900 text-white">
                    <Zap size={19} strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-bold text-ink">{aiStatus.friendly.displayName}</h3>
                      <span className="badge bg-brand-100 text-brand-700">当前使用</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-6 text-muted">
                      {aiStatus.friendly.description}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="section-heading">擅长领域</h4>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {aiStatus.friendly.strengths.map((s) => (
                    <span
                      key={s}
                      className="rounded border border-line bg-canvas-alt px-3 py-1.5 text-[12px] font-medium text-ink-soft"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-line/60 bg-canvas-alt/40 p-4">
                <h4 className="text-xs font-semibold text-muted">可选引擎版本</h4>
                <p className="mt-2 text-[12px] leading-5 text-muted">
                  系统支持「校园灵感版」和「深度爆款版」两套创作引擎。管理员可在 Vercel 环境变量中通过{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">DOUBAO_MODEL</code>{" "}
                  变量切换。切换后需重新部署生效。
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-coral-200 bg-coral-50/30 p-6 text-center">
              <p className="text-sm font-semibold text-coral-700">AI 引擎未配置</p>
              <p className="mt-1.5 text-[13px] leading-5 text-coral-600">
                在 Vercel 环境变量中配置 DOUBAO_API_KEY 后重新部署即可激活。
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="panel mt-5 p-5">
        <h2 className="text-sm font-bold text-ink">表达边界</h2>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          系统默认把内容定位为非官方校园生活攻略、学长学姐经验、新生避坑，不允许冒充学校官方、老师或辅导员。
          涉及校园卡、床品、开学用品时，应使用「按个人需要了解」「以实际规则为准」「建议提前问清楚」等中性表达。
        </p>
      </section>
    </>
  );
}
