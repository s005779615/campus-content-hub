import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { RiskHit } from "@/lib/types";

export function RiskAlert({ hits }: { hits: RiskHit[] }) {
  if (!hits.length) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-brand-200/60 bg-brand-50/60 px-4 py-3 text-sm font-medium text-brand-700">
        <CheckCircle2 size={17} className="text-brand-500 shrink-0" />
        合规检查通过：未发现内置风险词。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-coral-100 bg-coral-50/70 p-4">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-coral-700">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-100 text-coral-600">
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
