import { AlertTriangle } from "lucide-react";

export function ConfigWarning() {
  return (
    <div className="panel mx-auto max-w-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-coral-50 p-2 text-coral-600">
          <AlertTriangle size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">需要先配置 Supabase</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            请复制 <code>.env.example</code> 为 <code>.env.local</code>，填入
            Supabase URL、Anon Key 和 Service Role Key 后重新启动项目。
          </p>
        </div>
      </div>
    </div>
  );
}
