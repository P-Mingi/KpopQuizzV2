import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-5">
      <p className="text-5xl font-semibold mb-2">404</p>
      <p className="text-sm text-secondary mb-6">This page doesn&apos;t exist</p>
      <Link href="/" className="px-6 py-3 rounded-[14px] bg-accent text-bg-primary text-sm font-semibold">
        Go home
      </Link>
    </div>
  );
}
