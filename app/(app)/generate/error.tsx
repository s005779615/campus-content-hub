"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GenerateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-50 text-coral-500">
        <AlertTriangle size={28} />
      </div>
      <h2 className="mt-4 text-lg font-bold text-ink">页面出错了</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        {error.message || "渲染内容时发生异常，请刷新页面后重试。"}
      </p>
      <button className="button-primary mt-6" onClick={reset}>
        <RefreshCw size={16} />
        重新加载
      </button>
    </div>
  );
}
