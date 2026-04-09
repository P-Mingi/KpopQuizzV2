import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <div className="mt-20 text-center">
      <p className="text-5xl font-semibold text-primary">404</p>
      <p className="text-base text-secondary mt-2">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="inline-block mt-4 px-6 py-3 rounded-full bg-accent text-white text-sm font-medium"
      >
        Go home
      </Link>
    </div>
  );
}
