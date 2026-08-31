import Link from 'next/link';

import type { Metadata } from 'next';

// V-BUILDER-3 step 3 (L-047): the public DMCA / takedown page. A legit public page (indexable,
// one H1), linked from the footer + allowlisted. States the process + the contact path.
export const metadata: Metadata = {
  title: 'DMCA & Image Takedown',
  description: 'How to report a copyrighted image on KpopQuiz and have it taken down.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/dmca' },
};

export default function DmcaPage(): React.ReactElement {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-medium mb-2">DMCA &amp; Image Takedown</h1>
      <p className="text-sm text-secondary mb-8">Last updated: August 5, 2026</p>

      <p className="text-sm text-secondary leading-relaxed">
        KpopQuiz (kpopquiz.org) lets fans add images to the spaces they curate. We copy every uploaded
        image into our own storage and review uploads after they go live. If you own an image and want it
        removed, we act on valid requests quickly.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">1. How to request a takedown</h2>
      <p className="text-sm text-secondary leading-relaxed">
        Send us a notice through our <Link href="/contact" className="underline">contact page</Link> that
        includes:
      </p>
      <ul className="text-sm text-secondary leading-relaxed list-disc pl-5 mt-2 space-y-1">
        <li>the exact URL of the page or image you want removed;</li>
        <li>a description of the work you own and proof you own it (or represent the owner);</li>
        <li>your name and a way to reach you;</li>
        <li>a statement, made in good faith, that the use is not authorized by you, the owner, or the law.</li>
      </ul>

      <h2 className="text-lg font-medium mt-8 mb-3">2. What we do</h2>
      <p className="text-sm text-secondary leading-relaxed">
        A valid request is actioned by our moderation team: the image is hidden from every page it appears
        on immediately, and removed from our storage. A hidden or removed image is served nowhere. We may
        also remove images proactively during routine moderation, without a request.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">3. Counter-notice</h2>
      <p className="text-sm text-secondary leading-relaxed">
        If you uploaded an image that was removed and you believe that was a mistake, reply through the
        contact page with an explanation and we will review it.
      </p>

      <h2 className="text-lg font-medium mt-8 mb-3">4. Repeat infringers</h2>
      <p className="text-sm text-secondary leading-relaxed">
        Accounts that repeatedly upload infringing images may lose the ability to add images or be removed
        from the platform.
      </p>

      <p className="text-sm text-secondary leading-relaxed mt-8">
        See also our <Link href="/terms" className="underline">Terms</Link> and{' '}
        <Link href="/privacy" className="underline">Privacy</Link> pages.
      </p>
    </div>
  );
}
