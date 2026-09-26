'use client';
import { useState } from 'react';

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(command).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        );
      }}
      className="press inline-flex h-10 items-center gap-3 rounded-full border border-border bg-background px-4 font-mono text-[13px] hover:bg-surface"
      aria-label={`Copy: ${command}`}
    >
      <span className="text-muted">$</span>
      {command}
      <span className="w-12 text-right text-xs text-muted">{copied ? 'copied' : 'copy'}</span>
    </button>
  );
}
