import { EmbedGenerator } from '@/components/embed/embed-generator';
import { getBrowseQuizzes } from '@/lib/db/queries/quizzes';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

// W4b item 4 - the internal snippet generator (spec section 10).
//
// Lives under /admin, which is already noindex and already absent from the sitemap, so
// it inherits both without a new rule. It is a tool for us, not a page for anyone else.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Embed snippet generator',
  robots: { index: false, follow: false },
};

export default async function EmbedGeneratorPage(): Promise<React.ReactElement> {
  // Real published quizzes, most played first. Nothing invented, nothing padded.
  const quizzes = await safeFetch(getBrowseQuizzes({ sort: 'most_played', limit: 60, offset: 0 }), [], '[admin/embed] getBrowseQuizzes');

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium text-primary">Embed snippet generator</h1>
      <p className="text-sm text-secondary mt-2 leading-relaxed">
        Pick a quiz, set the partner key, copy the block. The visible link above the iframe is the
        part that carries SEO value, so it is always included and cannot be switched off.
      </p>
      <EmbedGenerator
        quizzes={quizzes.map((q) => ({ slug: q.slug, title: q.title }))}
      />
    </div>
  );
}
