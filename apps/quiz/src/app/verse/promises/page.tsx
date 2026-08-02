import type { Metadata } from 'next';
import Link from 'next/link';

import { OrbitMark } from '@/components/verse/brand/verse-wordmarks';
import { COVENANT, splitPromise } from '@/lib/verse/covenant';
import { jsonLdScript } from '@/lib/verse/jsonld';

// V-TRUST step 1 - THE PROMISE PAGE. The covenant is owner-authored and LOCKED
// (docs/workstream-vtrust.md, 2026-08-01); it renders verbatim from the single
// source of truth in @/lib/verse/covenant. This is the most important
// non-content page on the site: the public statement of what we owe fans and
// what we will never do. It is now REAL (draft/noindex removed) and indexed.
const CANONICAL = 'https://kpopquiz.org/verse/promises';

// V-TRUST step 3 - integrity link-backs. Where a promise maps to a REAL shipped
// feature, the covenant proves itself by linking to the product that keeps it.
// Keyed by promise index (0-based). Promise 3 ("you are never locked in") was
// reworded by the owner away from an export-mechanism claim to a true-today
// ownership statement, so it needs no link-back (see the doc's Reword note).
// These target real, live, indexable pages.
const LINKBACKS: Record<number, { href: string; label: string }> = {
  1: { href: '/verse/bts/wiki/borahae', label: 'See a page that credits the fan who wrote it' }, // promise 2 - the named byline
  4: { href: '/verse/bts/wiki/army-bomb', label: 'See the sources behind the facts' }, // promise 5 - the source chips
};

export const metadata: Metadata = {
  title: COVENANT.title,
  description: COVENANT.standfirst,
  alternates: { canonical: CANONICAL },
  openGraph: { title: COVENANT.title, description: COVENANT.standfirst, url: CANONICAL, type: 'article' },
  twitter: { card: 'summary', title: COVENANT.title, description: COVENANT.standfirst },
};

export default function VersePromisesPage(): React.ReactElement {
  return (
    <div className="verse-page verse-scope" style={{ maxWidth: 660, margin: '0 auto', padding: '64px 20px 128px' }}>
      {jsonLdScript({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: COVENANT.title,
        description: COVENANT.standfirst,
        author: { '@type': 'Organization', name: 'KpopVerse', url: 'https://kpopquiz.org/verse' },
        publisher: { '@type': 'Organization', name: 'KpopVerse', url: 'https://kpopquiz.org/verse' },
        datePublished: '2026-08-01',
        inLanguage: 'en',
        isAccessibleForFree: true,
        mainEntityOfPage: CANONICAL,
      })}

      {/* Emblem + eyebrow: the orbit identity, quiet, at the head of the charter. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <OrbitMark size={30} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--verse-brand-text)' }}>The covenant</span>
      </div>

      <h1 style={{ fontSize: 'clamp(2.15rem, 5.4vw, 3.1rem)', fontWeight: 800, letterSpacing: '-0.032em', lineHeight: 1.04, margin: 0, color: 'var(--text-primary)', textWrap: 'balance' } as React.CSSProperties}>
        {COVENANT.title}
      </h1>
      <p style={{ maxWidth: '52ch', fontSize: '1.1875rem', lineHeight: 1.55, margin: '18px 0 0', color: 'var(--text-secondary)', textWrap: 'pretty' } as React.CSSProperties}>
        {COVENANT.standfirst}
      </p>

      <div role="presentation" style={{ height: 1, background: 'var(--border)', margin: '44px 0 4px' }} />

      <ol style={{ display: 'flex', flexDirection: 'column', gap: 40, margin: '40px 0 0', padding: 0, listStyle: 'none' }}>
        {COVENANT.promises.map((text, i) => {
          const { lead, rest } = splitPromise(text);
          return (
            <li key={i} style={{ display: 'flex', gap: 18 }}>
              <span aria-hidden style={{ flexShrink: 0, width: '1.75rem', textAlign: 'right', fontSize: '0.95rem', fontWeight: 800, color: 'var(--verse-brand-text)', fontVariantNumeric: 'tabular-nums', paddingTop: '0.28rem', lineHeight: 1 }}>
                {i + 1}
              </span>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.1875rem', fontWeight: 800, letterSpacing: '-0.014em', lineHeight: 1.3, margin: 0, color: 'var(--text-primary)', textWrap: 'balance' } as React.CSSProperties}>
                  {lead}
                </h2>
                {rest ? (
                  <p style={{ maxWidth: '60ch', fontSize: '1rem', lineHeight: 1.72, margin: '7px 0 0', color: 'var(--text-secondary)' }}>
                    {rest}
                  </p>
                ) : null}
                {LINKBACKS[i] ? (
                  <Link href={LINKBACKS[i].href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 11, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--verse-brand-text)', textDecoration: 'none' }}>
                    {LINKBACKS[i].label}
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {/* The signature, set apart like the foot of a signed charter. */}
      <div style={{ marginTop: 56, paddingTop: 26, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <OrbitMark size={26} />
        <p style={{ margin: 0, fontSize: '1.0625rem', fontStyle: 'italic', fontWeight: 500, color: 'var(--text-primary)' }}>
          {COVENANT.signature}
        </p>
      </div>

      <Link href="/verse" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 40, fontSize: 14, fontWeight: 700, color: 'var(--verse-brand-text)', textDecoration: 'none' }}>
        Back to Fandoms
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </div>
  );
}
