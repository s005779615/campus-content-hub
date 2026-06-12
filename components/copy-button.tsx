"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({
  text,
  label = "复制"
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
        copied
          ? "border-brand-300 bg-canvas-alt text-ink"
          : "border-line bg-white text-muted hover:border-brand-400 hover:text-ink"
      }`}
      onClick={copy}
      type="button"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "已复制" : label}
    </button>
  );
}
