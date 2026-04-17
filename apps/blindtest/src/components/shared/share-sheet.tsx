'use client';

import { useState } from 'react';
import { shareToTwitter, shareToReddit, copyToClipboard } from '@/lib/share';

interface ShareSheetProps {
  shareText: string;
  shareUrl: string;
  onClose: () => void;
}

export function ShareSheet({ shareText, shareUrl, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
      <div onClick={e => e.stopPropagation()} className="relative w-full max-w-sm md:max-w-md bg-white dark:bg-[#1a1a22] rounded-t-2xl md:rounded-2xl p-4 md:p-5 z-10">
        <div className="w-8 h-1 rounded-full bg-[#E8E6E0] dark:bg-[rgba(255,255,255,0.1)] mx-auto mb-4 md:hidden" />
        <p className="text-sm font-semibold text-primary mb-3">Share your score</p>

        <div className="flex flex-col gap-2">
          {/* Copy link */}
          <button onClick={handleCopy} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] hover:bg-[#FAF9F6] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-[#888780] dark:text-white/40">
                <path d="M6.5 9.5l3-3M5.5 7L4 8.5a2.12 2.12 0 0 0 3 3L8.5 10M10.5 9l1.5-1.5a2.12 2.12 0 0 0-3-3L7.5 6" />
              </svg>
            </div>
            <span className="text-xs font-medium text-primary">{copied ? 'Copied!' : 'Copy link'}</span>
          </button>

          {/* Share to X */}
          <button onClick={() => shareToTwitter(shareText, shareUrl)} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] hover:bg-[#FAF9F6] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#0D0D12] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="#fff"><path d="M11.02 1.28H13.1L8.56 6.48l5.34 7.06h-4.18L6.34 9.2l-3.86 4.34H.4l4.86-5.56L.1 1.28h4.28L7.5 5.32l3.52-4.04zm-.74 12.14h1.22L3.78 2.52H2.48l7.8 10.9z" /></svg>
            </div>
            <span className="text-xs font-medium text-primary">Share on X</span>
          </button>

          {/* Share to Reddit */}
          <button onClick={() => shareToReddit(shareText, shareUrl)} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] hover:bg-[#FAF9F6] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-[#FF4500] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="#fff"><circle cx="7" cy="7" r="6" fill="none" /><path d="M11.5 7a1.1 1.1 0 0 0-1.87-.78 5.4 5.4 0 0 0-2.95-.87l.5-2.35 1.63.35a.78.78 0 1 0 .08-.4l-1.82-.39a.22.22 0 0 0-.26.17l-.56 2.62a5.5 5.5 0 0 0-3.02.87A1.1 1.1 0 1 0 2.5 7a2.15 2.15 0 0 0 0 .31c0 1.58 1.84 2.86 4.12 2.86s4.12-1.28 4.12-2.86A2.15 2.15 0 0 0 11.5 7zM4.87 7.78a.78.78 0 1 1 .78-.78.78.78 0 0 1-.78.78zm3.48 1.52a2.72 2.72 0 0 1-1.73.46 2.72 2.72 0 0 1-1.73-.46.22.22 0 0 1 .31-.31c.36.35 1.04.46 1.42.46s1.06-.11 1.42-.46a.22.22 0 0 1 .31.31zm-.22-1.52a.78.78 0 1 1 .78-.78.78.78 0 0 1-.78.78z" /></svg>
            </div>
            <span className="text-xs font-medium text-primary">Share on Reddit</span>
          </button>

          {/* Native share (mobile) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button onClick={() => navigator.share({ title: 'K-pop Blindtest', text: shareText, url: shareUrl }).catch(() => {})} className="flex items-center gap-3 p-3 rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] hover:bg-[#FAF9F6] dark:hover:bg-[rgba(255,255,255,0.06)] transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[#D4537E] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"><path d="M3 8v3.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8" /><path d="M7 1.5v7" /><path d="M4.5 4L7 1.5 9.5 4" /></svg>
              </div>
              <span className="text-xs font-medium text-primary">More options</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
