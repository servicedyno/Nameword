import { useState } from "react";
import { LuCopy, LuCheck } from "react-icons/lu";

export default function CopyButton({ text, label = "Copy", className = "", testid = "copy-button" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs font-medium text-gray-200 transition-colors hover:bg-white/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 ${className}`}
      data-testid={testid}
    >
      {copied ? <LuCheck className="h-3.5 w-3.5 text-emerald-300" /> : <LuCopy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
