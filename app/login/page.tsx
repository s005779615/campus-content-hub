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
              校园内容运营平台 v2 · 非官方攻略生成
            </p>
          </div>
          <LoginForm />
        </div>
      </section>

      {/* Right: Hero — 简洁克制 */}
      <section className="hidden border-l border-line/40 bg-gradient-to-br from-white via-white to-brand-50/30 p-16 lg:flex lg:items-center">
        <div className="mx-auto max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-line/60 bg-white px-4 py-1.5 text-xs font-medium text-muted shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            校园内容运营平台
          </span>
          <h2 className="mt-6 text-[40px] font-bold leading-[1.15] tracking-tightest text-ink">
            用真实的
            <br />
            <span className="text-brand-600">学长学姐视角</span>
            <br />
            讲好每个学校
          </h2>
          <p className="mt-6 max-w-sm text-[15px] leading-7 text-muted">
            基于学校资料生成非官方校园攻略，自动审核内容风险，发布数据实时回传。
          </p>
          <div className="mt-10 grid gap-3">
            {[
              { num: "01", title: "以学校资料为基础", desc: "宿舍、食堂、周边，生成真实内容" },
              { num: "02", title: "风险词自动审核", desc: "不冒充官方，不强制办理" },
              { num: "03", title: "发布数据回传", desc: "播放、私信、成交，一目了然" },
            ].map((item) => (
              <div key={item.num} className="group flex gap-4 rounded-xl border border-transparent bg-white/80 px-4 py-3.5 transition-all hover:border-line/60 hover:bg-white hover:shadow-sm">
                <span className="text-xs font-bold text-muted-lighter tabular-nums group-hover:text-brand-400 transition-colors">
                  {item.num}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
