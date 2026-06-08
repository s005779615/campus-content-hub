import { KeyRound, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import { riskTermSuggestions } from "@/lib/constants";
import { getAiProviderStatus } from "@/lib/content-generator";

export default async function SettingsPage() {
  const { profile } = await requireAuth();
  const aiStatus = getAiProviderStatus();

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
              <dt className="text-muted">AI 接口</dt>
              <dd className="font-medium text-ink">
                {aiStatus.provider === "template"
                  ? "使用本地模板生成"
                  : `${aiStatus.label}${aiStatus.configured ? " 已配置" : " 未配置"}`}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">AI 模型</dt>
              <dd className="font-medium text-ink">{aiStatus.model}</dd>
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
                <div className="font-medium text-coral-600">禁止：“{term}”</div>
                <div className="text-muted">建议：“{suggestion}”</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel mt-5 p-4">
        <h2 className="text-sm font-semibold text-ink">表达边界</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          系统默认把内容定位为非官方校园生活攻略、学长学姐经验、新生避坑，不允许冒充学校官方、老师或辅导员。
          涉及校园卡、床品、开学用品时，应使用“按个人需要了解”“以实际规则为准”“建议提前问清楚”等中性表达。
        </p>
      </section>

      <section className="panel mt-5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <KeyRound size={17} className="text-brand-700" />
          <h2 className="text-sm font-semibold text-ink">豆包接入状态</h2>
        </div>
        <div className="grid gap-4 p-4 text-sm lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-md border border-line bg-canvas p-3">
            <div className="text-muted">当前状态</div>
            <div className="mt-1 font-semibold text-ink">
              {aiStatus.provider === "doubao"
                ? aiStatus.configured
                  ? "豆包已配置"
                  : "豆包缺少 API Key"
                : aiStatus.provider === "openai"
                  ? "当前使用 OpenAI"
                  : "当前使用本地模板"}
            </div>
            <div className="mt-2 leading-6 text-muted">
              {aiStatus.configured
                ? `模型：${aiStatus.model}`
                : "补上 DOUBAO_API_KEY 或 ARK_API_KEY 后，重新部署一次即可生效。"}
            </div>
          </div>
          <div className="rounded-md border border-line bg-white p-3">
            <div className="font-medium text-ink">Vercel 需要的变量</div>
            <div className="mt-3 grid gap-2 font-mono text-xs text-muted sm:grid-cols-2">
              <code className="rounded bg-canvas px-2 py-1">AI_PROVIDER=doubao</code>
              <code className="rounded bg-canvas px-2 py-1">DOUBAO_API_KEY=...</code>
              <code className="rounded bg-canvas px-2 py-1">DOUBAO_MODEL={aiStatus.model}</code>
              <code className="rounded bg-canvas px-2 py-1">
                DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
              </code>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
