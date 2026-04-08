'use client';

import Link from 'next/link';

export function SignupPromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-[430px] bg-surface rounded-t-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-fadeSlideUp"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-lg font-semibold mb-1">You&apos;re on a roll!</p>
        <p className="text-sm text-secondary mb-4">
          Sign up to save your progress:
        </p>
        <ul className="space-y-2 mb-5">
          {['Keep your scores and streak', 'Track group mastery levels', 'Earn badges and climb leaderboards', 'Play the daily challenge'].map(item => (
            <li key={item} className="flex items-center gap-2 text-sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7L6 10L11 4" stroke="var(--correct)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {item}
            </li>
          ))}
        </ul>
        <Link
          href="/signup"
          className="block w-full py-3.5 rounded-[14px] bg-accent text-bg-primary text-sm font-semibold text-center mb-3"
        >
          Sign up - it&apos;s free
        </Link>
        <button onClick={onClose} className="block w-full text-center text-xs text-tertiary py-2">
          Maybe later
        </button>
      </div>
    </div>
  );
}
