import { ShieldAlert } from "lucide-react";
import type { RiskHit } from "@/lib/types";

export function RiskAlert({ hits }: { hits: RiskHit[] }) {
  if (!hits.length) {
    return (
      <div className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700">
        合规检查通过：未发现内置风险词。
      </div>
    );
  }

  return (
    <div className="rounded-md border border-coral-500/30 bg-coral-50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-coral-600">
        <ShieldAlert size={17} />
        发现需要修改的风险表达
      </div>
      <div className="mt-2 space-y-2">
        {hits.map((hit) => (
          <div key={hit.term} className="text-sm text-ink">
            <span className="font-medium">“{hit.term}”</span>
            <span className="text-muted"> 建议改为 </span>
            <span className="font-medium text-brand-700">“{hit.suggestion}”</span>
          </div>
        ))}
      </div>
    </div>
  );
}
