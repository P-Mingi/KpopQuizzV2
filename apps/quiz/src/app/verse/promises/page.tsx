import type { Metadata } from 'next';
import Link from 'next/link';

// V-IDENTITY step 2 - the reserved charter slug. A stable placeholder for the
// KpopVerse covenant; V-TRUST fills it in and flips it indexable then. noindex
// for now (no real content yet). Allowlisted under /verse.
export const metadata: Metadata = {
  title: 'Our promises · KpopVerse',
  robots: { index: false, follow: true },
};

export default function VersePromisesPage(): React.ReactElement {
  return (
    <div className="verse-page verse-scope" style={{ maxWidth: 640, margin: '0 auto', padding: '48px 4px 120px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--verse-brand-text)' }}>KpopVerse · the covenant</p>
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '8px 0 16px', color: 'var(--text-primary)' }}>Our promises</h1>
      <p style={{ maxWidth: '60ch', fontSize: '1.0625rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
        The KpopVerse charter is being written. It will set out, in plain language, what curators own, what the platform promises the fans who build here, and how spaces are governed. This page is reserved so the link stays stable while the covenant takes shape.
      </p>
      <Link href="/verse" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24, fontSize: 14, fontWeight: 700, color: 'var(--verse-brand-text)', textDecoration: 'none' }}>
        Back to Fandoms
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </div>
  );
}
