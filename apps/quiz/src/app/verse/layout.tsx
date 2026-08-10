import localFont from 'next/font/local';

import type { Metadata } from 'next';

// V-IDENTITY step 2 (surface: favicon) - a layout for the whole Verse world. It
// overrides ONLY the tab favicon (the orbit mark) for /verse/* routes; Play routes
// (never under /verse) keep the root favicon byte-for-byte. Apple-touch stays the
// shared PNG for now.
export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/verse/brand/logo-64.png', type: 'image/png', sizes: '64x64' },
      { url: '/verse/brand/logo-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/verse/brand/logo-64.png',
    apple: [{ url: '/verse/brand/logo-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

// V-FOUNDATION F4.1 - the home-v2 typeface set, self-hosted (next/font/local, the
// house pattern; quiz keeps Pretendard untouched). Fraunces = editorial display,
// Instrument Sans = UI/body, Spline Sans Mono = data/labels. Pretendard stays the
// fallback so hangul + latin-ext glyphs still resolve. Only the /verse subtree
// carries the `.verse-v2` class + these variables, so Play is byte-identical.
const fraunces = localFont({
  src: [
    { path: '../../../public/fonts/Fraunces-400-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/Fraunces-500-latin.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/Fraunces-600-latin.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-fraunces', display: 'swap', fallback: ['Georgia', 'Times New Roman', 'serif'], preload: true,
});
const instrument = localFont({
  src: [
    { path: '../../../public/fonts/InstrumentSans-400-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/InstrumentSans-400i-latin.woff2', weight: '400', style: 'italic' },
    { path: '../../../public/fonts/InstrumentSans-500-latin.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/InstrumentSans-600-latin.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-instrument', display: 'swap', fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'], preload: true,
});
const splineMono = localFont({
  src: [
    { path: '../../../public/fonts/SplineSansMono-400-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/SplineSansMono-500-latin.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-spline-mono', display: 'swap', fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'], preload: false,
});

// ITERATION 6 FIX 2 - stamp the saved sidebar-fold preference on <html> BEFORE first paint, so
// the user's choice survives navigation with no flash. Deliberately a blocking inline script
// rather than a server-side cookies() read: cookies() is a Dynamic API and would opt every Verse
// reader page out of static/ISR rendering, which the SEO work depends on. With no cookie the
// attribute is absent and CSS falls back to the per-route default (home open, content folded).
// Static string, no interpolation, so there is no injection sink here.
const NAV_PREF_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )verse_nav=(open|rail)/);if(m)document.documentElement.setAttribute('data-verse-nav',m[1])}catch(e){}`;

export default function VerseWorldLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  // display:contents wrapper: it carries the font variables + the `.verse-v2` token
  // scope (globals.css) for every /verse page, but generates no box, so the page
  // layout is unchanged. Custom properties still inherit to all descendants.
  return (
    <div className={`verse-v2 ${fraunces.variable} ${instrument.variable} ${splineMono.variable}`} style={{ display: 'contents' }}>
      <script dangerouslySetInnerHTML={{ __html: NAV_PREF_SCRIPT }} />
      {children}
    </div>
  );
}
