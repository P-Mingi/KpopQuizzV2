import Link from 'next/link';

export default function ProfilePage() {
  return (
    <div className="px-5 pt-7 pb-8 text-center">
      <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="3.5" stroke="var(--text-tertiary)" strokeWidth="1.5" />
          <path d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm text-text-secondary mb-4">Sign in to track your progress</p>
      <Link
        href="/login"
        className="inline-block px-6 py-3 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold"
      >
        Sign in
      </Link>
    </div>
  );
}
