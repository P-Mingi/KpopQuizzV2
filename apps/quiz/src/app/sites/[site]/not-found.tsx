// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/not-found.tsx, rows 27, H-8: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { SITE } from '@/lib/site/registry';

export default function NotFound(): React.ReactElement {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-5 py-16">
      {/* F7 - confused (think) rabbit, static. Conveys "page not found". */}
      <Mascot variant="think" animate="none" size={104} alt="" />
      <p className="text-6xl font-bold text-primary mb-2 mt-3">404</p>
      <p className="text-lg text-secondary mb-1">This page doesn&apos;t exist</p>
      <p className="text-sm text-tertiary mb-8 text-center max-w-sm">
        Maybe the quiz you&apos;re looking for moved, or the link was wrong.
      </p>

      {/* Search: only where the site has a search page (its quizzes). */}
      {SITE.features.quizzes ? (
        <form action="/search" method="GET" className="w-full max-w-md mb-10">
          <input
            type="text"
            name="q"
            placeholder="Search quizzes..."
            aria-label="Search quizzes"
            className="w-full py-3 px-4 rounded-xl border border-default bg-surface text-sm text-primary placeholder:text-ghost outline-none focus:border-accent transition-colors"
          />
        </form>
      ) : null}

      {/* Links */}
      <div className="flex flex-wrap justify-center gap-4 text-sm mt-8">
        <Link href="/" className="text-accent font-medium hover:underline">
          Home
        </Link>
        {SITE.features.quizzes ? (
          <Link href="/quizzes" className="text-accent font-medium hover:underline">
            Browse all quizzes
          </Link>
        ) : null}
        {SITE.features.create ? (
          <Link href="/create" className="text-accent font-medium hover:underline">
            Create a quiz
          </Link>
        ) : null}
      </div>
    </div>
  );
}
