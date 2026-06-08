import { Brain, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
        <section className="panel p-4">
          <h2 className="text-sm font-semibold text-ink">当前账号</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">邮箱</dt>
              <dd className="font-medium text-ink">{profile.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">姓名</dt>
              <dd className="font-medium text-ink">{profile.full_name || "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">角色</dt>
              <dd className="font-medium text-ink">
                {profile.role === "admin" ? "管理员" : "队员"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">AI 引擎状态</dt>
              <dd className="font-medium text-ink">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
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
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <ShieldCheck size={17} className="text-brand-700" />
            <h2 className="text-sm font-semibold text-ink">内容审核规则</h2>
          </div>
          <div className="divide-y divide-line">
            {Object.entries(riskTermSuggestions).map(([term, suggestion]) => (
              <div key={term} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[0.7fr_1.3fr]">
                <div className="font-medium text-coral-600">禁止：&ldquo;{term}&rdquo;</div>
                <div className="text-muted">建议：&ldquo;{suggestion}&rdquo;</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel mt-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Brain size={17} className="text-brand-700" />
          <h2 className="text-sm font-semibold text-ink">AI 创作引擎</h2>
          {isActive ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Sparkles size={11} />
              已激活
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-coral-50 px-2 py-0.5 text-xs font-medium text-coral-600">
              未配置
            </span>
          )}
        </div>

        <div className="p-4">
          {isActive ? (
            <div className="space-y-4">
              {/* 当前激活的模型卡片 */}
              <div className="rounded-lg border-2 border-brand-200 bg-brand-50/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                    <Zap size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink">{aiStatus.friendly.displayName}</h3>
                      <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                        当前使用
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {aiStatus.friendly.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* 擅长领域 */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">擅长领域</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {aiStatus.friendly.strengths.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-line bg-white px-3 py-1 text-xs text-ink"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* 可选模型说明 */}
              <div className="rounded-md border border-line bg-canvas p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">可选引擎版本</h4>
                <p className="mt-2 text-xs leading-5 text-muted">
                  系统支持「校园灵感版」和「深度爆款版」两套创作引擎。管理员可在 Vercel 环境变量中通过{" "}
                  <code className="rounded bg-white px-1 py-0.5 font-mono">DOUBAO_MODEL</code>{" "}
                  变量切换。切换后需重新部署生效。
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-coral-300 bg-coral-50/30 p-4 text-center">
              <p className="text-sm font-medium text-coral-700">AI 引擎未配置</p>
              <p className="mt-1 text-xs leading-5 text-coral-600">
                在 Vercel 环境变量中配置 DOUBAO_API_KEY 后重新部署即可激活。
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="panel mt-5 p-4">
        <h2 className="text-sm font-semibold text-ink">表达边界</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          系统默认把内容定位为非官方校园生活攻略、学长学姐经验、新生避坑，不允许冒充学校官方、老师或辅导员。
          涉及校园卡、床品、开学用品时，应使用&ldquo;按个人需要了解&rdquo;&ldquo;以实际规则为准&rdquo;&ldquo;建议提前问清楚&rdquo;等中性表达。
        </p>
      </section>
    </>
  );
}
