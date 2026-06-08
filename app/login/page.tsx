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
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-base font-bold text-white">
              校
            </div>
            <h1 className="text-2xl font-semibold text-ink">{appName}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              面向校园团队的内容生成、保存、发布回填和数据看板后台。
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
      <section className="hidden border-l border-line bg-white p-10 lg:flex lg:items-center">
        <div className="mx-auto max-w-lg">
          <p className="text-sm font-medium text-brand-700">非官方校园生活攻略号</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-normal text-ink">
            帮队员把学校资料，变成能发布的校园内容。
          </h2>
          <div className="mt-8 grid gap-3">
            {[
              "学长学姐视角，不冒充学校官方",
              "先审核风险词，再复制发布",
              "发布链接和数据回填，管理员统一看板"
            ].map((item) => (
              <div key={item} className="rounded-md border border-line bg-canvas p-4 text-sm text-ink">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
