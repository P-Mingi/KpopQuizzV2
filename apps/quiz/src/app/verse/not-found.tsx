import Link from 'next/link';

import { OrbitMark } from '@/components/verse/brand/verse-wordmarks';

// V-IDENTITY step 2 (surface: 404) - the Verse world's own not-found. Renders
// inside the root layout, so on a /verse/* URL the world chrome is already the
// KpopVerse header + Verse footer; this is the on-brand, helpful body. Next sets
// the 404 status automatically (inherently noindex).
const VIOLET = '#7c5cfc';

export default function VerseNotFound(): React.ReactElement {
  return (
    <div className="verse-scope" style={{ maxWidth: 600, margin: '0 auto', padding: '72px 4px 120px', textAlign: 'center' }}>
      <span style={{ display: 'inline-flex', marginBottom: 20 }}><OrbitMark size={56} /></span>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--verse-brand-text)', margin: 0 }}>KpopVerse</p>
      <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '10px 0 14px', color: 'var(--text-primary)' }}>
        This corner of the Verse isn&rsquo;t mapped yet
      </h1>
      <p style={{ maxWidth: '52ch', margin: '0 auto', fontSize: '1.0625rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
        The fandom home you followed isn&rsquo;t here. It may not have a space yet, or the link has moved. Try the directory or a search.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
        <Link href="/verse" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 20px', borderRadius: 12, background: VIOLET, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          Browse all fandoms
        </Link>
        <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 20px', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          Search
        </Link>
      </div>
    </div>
  );
}
