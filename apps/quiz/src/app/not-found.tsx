import Link from 'next/link';

const POPULAR_GROUPS = [
  { name: 'BTS', slug: 'bts' },
  { name: 'BLACKPINK', slug: 'blackpink' },
  { name: 'Stray Kids', slug: 'stray-kids' },
  { name: 'aespa', slug: 'aespa' },
  { name: 'SEVENTEEN', slug: 'seventeen' },
  { name: 'TWICE', slug: 'twice' },
  { name: 'NewJeans', slug: 'newjeans' },
  { name: '(G)I-DLE', slug: 'g-i-dle' },
];

export default function NotFound(): React.ReactElement {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 py-16">
      <p className="text-6xl font-bold text-primary mb-2">404</p>
      <p className="text-lg text-secondary mb-1">This page doesn&apos;t exist</p>
      <p className="text-sm text-tertiary mb-8 text-center max-w-sm">
        Maybe the quiz you&apos;re looking for moved, or the link was wrong.
      </p>

      {/* Search */}
      <form action="/search" method="GET" className="w-full max-w-md mb-10">
        <input
          type="text"
          name="q"
          placeholder="Search quizzes..."
          aria-label="Search quizzes"
          className="w-full py-3 px-4 rounded-xl border border-default bg-surface text-sm text-primary placeholder:text-ghost outline-none focus:border-accent transition-colors"
        />
      </form>

      {/* Popular groups */}
      <div className="text-center mb-8">
        <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">
          Popular quizzes
        </p>
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {POPULAR_GROUPS.map((g) => (
            <Link
              key={g.slug}
              href={`/${g.slug}-quiz`}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-bg text-accent hover:bg-accent hover:text-white transition-colors"
            >
              {g.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/" className="text-accent font-medium hover:underline">
          Home
        </Link>
        <Link href="/quizzes" className="text-accent font-medium hover:underline">
          Browse all quizzes
        </Link>
        <Link href="/create" className="text-accent font-medium hover:underline">
          Create a quiz
        </Link>
      </div>
    </div>
  );
}
