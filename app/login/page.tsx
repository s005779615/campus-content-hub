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
    <main className="min-h-screen bg-[#fbfbfa]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-5 pb-10 pt-8 sm:px-8 sm:pt-10 lg:px-12">
        <header className="flex items-center border-b border-line pb-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-900 text-lg font-semibold text-white">
            校
          </span>
          <span className="ml-3.5 text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {appName}
          </span>
          <span className="mx-3.5 h-5 w-px bg-line" />
          <span className="text-sm text-muted">团队工作台</span>
        </header>

        <div className="grid flex-1 items-center gap-16 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
          <section className="mx-auto w-full max-w-[430px] lg:mx-0">
            <div className="mb-9">
              <h1 className="text-[32px] font-semibold tracking-heading text-ink sm:text-[38px]">
                成员登录
              </h1>
              <p className="mt-3 flex items-center gap-2.5 text-sm text-muted">
                <span className="h-2 w-2 rounded-full bg-brand-400" />
                内容服务运行正常
              </p>
            </div>
            <LoginForm />
          </section>

          <section className="hidden border-l border-line pl-16 lg:block">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-light">WORKSPACE</p>
            <h2 className="mt-5 max-w-md text-[34px] font-semibold leading-[1.25] tracking-heading text-ink">
              从内容生成到发布复盘，
              <br />
              保持团队工作清晰有序。
            </h2>
            <div className="mt-12 divide-y divide-line border-y border-line">
              {[
                ["内容生成", "基于学校资料生成适合校园平台的内容"],
                ["发布任务", "分配每日任务并跟进团队完成进度"],
                ["数据回填", "记录播放、线索、加微信与成交结果"],
              ].map(([title, description], index) => (
                <div key={title} className="grid grid-cols-[48px_1fr] gap-3 py-5">
                  <span className="text-xs tabular-nums text-muted-light">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="grid grid-cols-3 divide-x divide-line border-t border-line pt-6 text-center lg:hidden">
          {[
            ["内容生成", "生成优质内容"],
            ["发布任务", "安排发布进度"],
            ["数据回填", "记录转化数据"],
          ].map(([title, description]) => (
            <div key={title} className="px-2">
              <p className="text-[13px] font-medium text-ink">{title}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-light">{description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
