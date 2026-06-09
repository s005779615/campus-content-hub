import { redirect } from "next/navigation";
import { ConfigWarning } from "@/components/config-warning";
import { getAuthContext } from "@/lib/auth";
import { appName } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <ConfigWarning />
      </main>
    );
  }

  const context = await getAuthContext();

  if (context) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_0.95fr]">
      {/* Left: Login form */}
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-10">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white shadow-md shadow-brand-200/40">
              校
            </div>
            <h1 className="text-[26px] font-bold tracking-heading text-ink">{appName}</h1>
            <p className="mt-2.5 text-sm leading-6 text-muted">
              面向校园团队的内容生成、保存、发布回填和数据看板后台。
            </p>
          </div>
          <LoginForm />
        </div>
      </section>

      {/* Right: Hero */}
      <section className="hidden border-l border-line/50 bg-white p-12 lg:flex lg:items-center">
        <div className="mx-auto max-w-lg">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            非官方校园生活攻略号
          </span>
          <h2 className="mt-4 text-[38px] font-bold leading-tight tracking-tightest text-ink">
            帮队员把学校资料
            <br />
            变成能发布的
            <br />
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              校园内容
            </span>
          </h2>
          <div className="mt-10 grid gap-3">
            {[
              { icon: "🎓", text: "学长学姐视角，不冒充学校官方" },
              { icon: "🛡️", text: "先审核风险词，再复制发布" },
              { icon: "📊", text: "发布链接和数据回填，管理员统一看板" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 rounded-xl border border-line/60 bg-canvas-alt/60 px-4 py-3.5 text-sm font-medium text-ink-soft"
              >
                <span className="text-lg">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
