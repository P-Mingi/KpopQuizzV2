import type { Metadata } from 'next';
import Link from 'next/link';

// V-IDENTITY step 2 reserved this slug; V-POLISH step 9 ships the covenant v0.
// Five plain-language promises, explicitly labeled a draft being refined with
// the founding curators (the audit's call: the trust surface V-HOME routes
// recruits to must not be an IOU). Still noindex until the owner flips it with
// the final wording.
export const metadata: Metadata = {
  title: 'Our promises · KpopVerse',
  robots: { index: false, follow: true },
};

const PROMISES: { title: string; body: string }[] = [
  {
    title: 'Your work stays yours',
    body: 'Everything you write here is credited to you, visibly, on the page it lives on. If you leave, your name stays on your work. We never strip attribution and we never present fan writing as our own.',
  },
  {
    title: 'Sources over vibes',
    body: 'Facts carry sources. Fan writing is labeled as fan writing. When the two disagree, the source wins and anyone can see why. Corrections are normal here, not drama.',
  },
  {
    title: 'No gatekeepers',
    body: 'Anyone can suggest an edit, signed in or not. The path from visitor to contributor to curator runs on real thresholds you can see, not on knowing the right people.',
  },
  {
    title: 'Curators run their spaces',
    body: 'A space belongs to its fandom. Curators decide how it looks, what it says and what the community builds. The platform sets the floor (sourcing, safety, credit) and stays out of the rest.',
  },
  {
    title: 'No scraping, no reselling',
    body: 'The catalog is built on open data (Wikidata and MusicBrainz, both CC0) and fan work is contributed knowingly. We do not scrape fan spaces elsewhere and we do not sell what fans build here.',
  },
];

export default function VersePromisesPage(): React.ReactElement {
  return (
    <div className="verse-page verse-scope" style={{ maxWidth: 640, margin: '0 auto', padding: '48px 4px 120px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--verse-brand-text)' }}>KpopVerse · the covenant</p>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '8px 0 10px', color: 'var(--text-primary)' }}>Our promises</h1>
      <p style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px', marginBottom: 20 }}>
        Draft · being refined with the founding curators
      </p>
      <ol style={{ display: 'flex', flexDirection: 'column', gap: 22, margin: 0, padding: 0, listStyle: 'none' }}>
        {PROMISES.map((p, i) => (
          <li key={p.title} style={{ display: 'flex', gap: 16 }}>
            <span aria-hidden style={{ flexShrink: 0, fontSize: 14, fontWeight: 800, color: 'var(--verse-brand-text)', fontVariantNumeric: 'tabular-nums', paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{p.title}</h2>
              <p style={{ maxWidth: '58ch', fontSize: '0.9375rem', lineHeight: 1.7, margin: '4px 0 0', color: 'var(--text-secondary)' }}>{p.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p style={{ maxWidth: '58ch', fontSize: '0.875rem', lineHeight: 1.7, marginTop: 28, color: 'var(--text-tertiary)' }}>
        These five hold while the full charter is written with the first curator class. The wording will change; the direction will not.
      </p>
      <Link href="/verse" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24, fontSize: 14, fontWeight: 700, color: 'var(--verse-brand-text)', textDecoration: 'none' }}>
        Back to Fandoms
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </div>
  );
}
