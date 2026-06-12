import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { RiskHit } from "@/lib/types";

export function RiskAlert({ hits }: { hits: RiskHit[] }) {
  if (!hits.length) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-line bg-white px-4 py-3 text-sm font-medium text-ink-soft">
        <CheckCircle2 size={17} className="shrink-0 text-brand-600" />
        合规检查通过：未发现内置风险词。
      </div>
    );
  }

  return (
    <div className="rounded-md border border-coral-100 bg-coral-50 p-4">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-coral-700">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-coral-100 text-coral-600">
          <AlertTriangle size={15} />
        </div>
        发现需要修改的风险表达
      </div>
      <div className="mt-3 space-y-2.5">
        {hits.map((hit) => (
          <div key={hit.term} className="rounded-lg bg-white/80 px-3.5 py-2.5 text-sm">
            <span className="font-semibold text-coral-700">禁止：「{hit.term}」</span>
            <span className="mx-1.5 text-muted-lighter">→</span>
            <span className="font-medium text-brand-700">建议：「{hit.suggestion}」</span>
          </div>
        ))}
      </div>
    </div>
  );
}
