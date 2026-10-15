'use client';

import { useState } from 'react';

/** Copies a ready credit line. The line itself is server-rendered beside it, so it reads without JS. */
export function CopyCredit({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <button
        type="button"
        className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[13px] font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          });
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? 'Credit line copied' : ''}</span>
    </>
  );
}
