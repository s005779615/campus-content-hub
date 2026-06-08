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
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="button-secondary" onClick={copy} type="button">
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "已复制" : label}
    </button>
  );
}
