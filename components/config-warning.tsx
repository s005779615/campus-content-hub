import { AlertTriangle } from "lucide-react";

export function ConfigWarning() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-coral-100 bg-white p-6 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral-50 text-coral-500">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink">需要先配置 Supabase</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            请复制 <code className="rounded-md bg-canvas-alt px-1.5 py-0.5 text-xs font-medium text-ink-soft">.env.example</code> 为{" "}
            <code className="rounded-md bg-canvas-alt px-1.5 py-0.5 text-xs font-medium text-ink-soft">.env.local</code>，填入
            Supabase URL、Anon Key 和 Service Role Key 后重新启动项目。
          </p>
        </div>
      </div>
    </div>
  );
}
