import Link from 'next/link';

import { CopyCredit } from './copy-credit';
import { DATA_LICENCE, LINK_NOTE, PRESS_EMAIL } from '@/lib/seo/org';

// SEO Mission 3, part F.3 (rulebook section 12.6): the licence block of every data page
// (/data/*, /stats, the Knowledge Report). A ready credit line with a copy button, CC BY 4.0
// for our numbers and charts, the "a link is appreciated; nofollow is fine" note, and the
// press contact. Server-rendered plain text: the credit line reads without JS, the button
// only copies it. It never asks for a followed link, a footer link or anything else.

export function CiteLicence({ credit, id = 'how-to-cite', children }: {
  /** The ready credit line, e.g. "Source: kpopquiz.org K-pop Knowledge Report 2026". */
  credit: string;
  /** Heading id, so a page can link to its own block (#how-to-cite). */
  id?: string;
  /** Extra lines, e.g. chart downloads. */
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <section
      aria-labelledby={id}
      className="mt-8 mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 text-[14px] leading-relaxed text-[var(--text-secondary)]"
    >
      <h2 id={id} className="text-base font-bold text-[var(--text-primary)]">How to cite this data</h2>
      <p className="mt-2">
        Our numbers and charts are free to reuse under{' '}
        <a href={DATA_LICENCE.url} rel="license" className="font-medium text-[var(--accent)] hover:underline">{DATA_LICENCE.name}</a>:
        credit kpopquiz.org. {LINK_NOTE}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 break-words font-mono text-[13px] text-[var(--text-primary)]">{credit}</p>
        <CopyCredit text={credit} />
      </div>
      {children}
      <p className="mt-3">
        Press and questions:{' '}
        <a href={`mailto:${PRESS_EMAIL}`} className="font-medium text-[var(--accent)] hover:underline">{PRESS_EMAIL}</a>
        {' '}·{' '}
        <Link href="/press" className="font-medium text-[var(--accent)] hover:underline">press kit</Link>
      </p>
    </section>
  );
}
