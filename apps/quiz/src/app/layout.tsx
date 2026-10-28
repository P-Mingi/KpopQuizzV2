import '@/styles/globals.css';

import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/react';
import { ThemeInit } from '@/components/layout/theme-init';
import { ToastProvider } from '@/components/ui/toast-provider';
import { SITE_ID } from '@/lib/site/registry';
import { withBasePath } from '@/lib/site/base-path';
import { siteRootMetadata, siteViewport } from '@/lib/site/metadata';
import { UX_V1 } from '@/lib/ux-v1';
import { uxStylesheetHref } from '@/lib/ux-v1/a0/stylesheet-href';

import type { Metadata, Viewport } from 'next';

// Blocking, runs before first paint: applies the stored theme class so there is
// no flash of the wrong theme. "system" (no stored value) sets no class, leaving
// the prefers-color-scheme media query to follow the OS. React 19 then does a
// recovery client-render of the root (an inline <script> in the tree triggers
// it) that resets <html className> and strips this class - <ThemeInit> re-applies
// it in a pre-paint layout effect, so it survives a reload with no visible flash.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme'),d=document.documentElement;d.classList.remove('light','dark');if(t==='dark')d.classList.add('dark');else if(t==='light')d.classList.add('light');}catch(e){}})();`;

// Reflects the active background for mobile browser chrome (system mode follows
// the OS; the toggle updates the live tag on explicit switch). color-scheme lets
// native controls/scrollbars match the theme. kpop keeps its two colours (lib/site/kpop.ts);
// anime and hub read the page token of their theme (O1, tokens.md 7).
export const viewport: Viewport = siteViewport();


const pretendard = localFont({
  src: [
    { path: '../../public/fonts/Pretendard-Regular-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Medium-latin.woff2', weight: '500', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-pretendard',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: 'Arial',
  // Not preloaded (SEO phase 1, 2026-10-27): every build runs UX v1, where Pretendard is only the
  // fallback of Inter (--ux-font) for a few glyphs. Its two files no longer compete with the CSS and
  // the LCP image on first load; they still load on demand (swap, Arial-adjusted fallback).
  preload: false,
});

// UX v1 (owner Q4): Inter is the latin body + display face; Pretendard stays the
// Korean/CJK fallback. Applied ONLY under the flag (its `--font-inter` variable is
// added to <html> and mapped onto --font-body/--font-display in globals under
// `html.ux-v1`), so flag-off renders Pretendard exactly as today. preload:false so
// an Inter preload never leaks onto a flag-off page - it loads on demand (swap)
// only where the flag applies it.
//
// Self-hosted (owner, 2026-10-25): the build no longer downloads it from Google Fonts, so a
// Google outage cannot fail a deploy or the CI. public/fonts/Inter-latin.woff2 is the exact file
// next/font/google served (Inter v20, latin subset, one variable file for weights 400 to 800),
// with the same unicode-range; licence: public/fonts/Inter-OFL.txt.
const inter = localFont({
  src: [{ path: '../../public/fonts/Inter-latin.woff2', weight: '400 800', style: 'normal' }],
  display: 'swap',
  variable: '--font-inter',
  preload: false,
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});

// DM Sans, the site-wide body face (--font-body in globals.css), self-hosted (owner,
// 2026-10-25): no request to Google Fonts from the visitor's browser any more (privacy of
// European visitors, speed), and none from the build. The two files are the exact ones Google
// served for weights 400 to 800 (DM Sans v17, one variable file per subset), each with Google's
// unicode-range, so the latin-ext file only loads for a page that needs it. Licence:
// public/fonts/DMSans-OFL.txt.
// Not preloaded (SEO phase 1, 2026-10-27): every build runs UX v1, whose body face is Inter, and no
// page renders this DM Sans (document.fonts on ten kpop page types; the hub home loads its own,
// components/hub/home/home-font.ts). Flag-off pages, never served, still get it on demand (swap).
const dmSans = localFont({
  src: [{ path: '../../public/fonts/DMSans-latin.woff2', weight: '400 800', style: 'normal' }],
  display: 'swap',
  variable: '--font-dm-sans',
  preload: false,
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});
const dmSansExt = localFont({
  src: [{ path: '../../public/fonts/DMSans-latin-ext.woff2', weight: '400 800', style: 'normal' }],
  display: 'swap',
  variable: '--font-dm-sans-ext',
  preload: false,
  declarations: [
    {
      prop: 'unicode-range',
      value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
    },
  ],
});

// Marker class + Inter variable go on <html> only when the redesign flag is on.
// The theme scripts (THEME_SCRIPT / ThemeInit) only add/remove `light`/`dark`, so
// `ux-v1` survives their classList churn.
const HTML_CLASS = UX_V1
  ? `${dmSans.variable} ${dmSansExt.variable} ${pretendard.variable} ${inter.variable} ux-v1`
  : `${dmSans.variable} ${dmSansExt.variable} ${pretendard.variable}`;

// O1 (tokens.md 2): the per-site sheets of anime and hub scope their rules by this attribute. A kpop
// page carries none, and the prop is absent (not undefined) so the kpop tree stays today's.
const HTML_SITE_ATTR: { 'data-site'?: string } = SITE_ID === 'kpop' ? {} : { 'data-site': SITE_ID };

// UX v11 stylesheet (tokens + shared components + page styles of styles/ux-v1/),
// linked ONLY when the flag is on, so flag-off pages carry no extra tag or byte
// (see app/api/ux-v1/a0/styles/route.ts). Versioned by a hash of its content, computed
// at build time in next.config.ts (UX_CSS_VERSION), so the address follows the CSS
// whatever the way of deploying (a command-line deploy has no commit sha).
// FandomVerse: under the anime build's base path (/anime) on the anime build, as it is everywhere else.
const UX_CSS_HREF = withBasePath(uxStylesheetHref(process.env.UX_CSS_VERSION));

// Canonical / Open Graph base. Use NEXT_PUBLIC_SITE_URL in production, but only
// when it is an absolute https origin - never let a dev value
// (http://localhost:3021) leak into canonical tags. Falls back to the live
// production domain otherwise. All page canonicals are relative and resolve
// against this base.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://kpopquiz.org';

// The kpop root metadata, as it is today. registry.test.ts reads these literals from this file, so they
// stay here (B1 report: the block moves to lib/site/kpop.ts when that test reads it there). anime and hub
// builds get a root of their own brand from lib/site/metadata.ts.
const KPOP_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KpopQuiz - Play K-pop Quizzes Made by Fans for Fans',
    template: '%s | KpopQuiz',
  },
  description:
    'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and many more groups. Made by real fans, played by thousands.',
  keywords: ['kpop quiz', 'kpop trivia', 'BTS quiz', 'BLACKPINK quiz', 'Stray Kids quiz', 'kpop game', 'kpop test', 'kpop fan quiz'],
  authors: [{ name: 'KpopQuiz' }],
  creator: 'KpopQuiz',
  publisher: 'KpopQuiz',
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'KpopQuiz',
    title: 'KpopQuiz - Play K-pop Quizzes Made by Fans for Fans',
    description:
      'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and many more groups. Made by real fans, played by thousands.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'KpopQuiz - Play K-pop Quizzes Made by Fans for Fans' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KpopQuiz - Play K-pop Quizzes Made by Fans for Fans',
    description:
      'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and many more groups. Made by real fans, played by thousands.',
    images: ['/og-default.png'],
  },
  other: {
    'p:domain_verify': '78daf33218de9b0d0115f0dbbaf48d6e',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
};

export const metadata: Metadata = siteRootMetadata(KPOP_METADATA);

interface RootLayoutProps {
  children: React.ReactNode;
}

// RENDER-FIX: the root layout is now free of every dynamic API. It renders only
// html/body, the pre-paint theme, providers and analytics - things every route
// (site chrome AND /embed) needs. The site chrome and the site-wide JSON-LD moved
// to app/(site)/layout.tsx; /embed sits outside that group, so an iframe gets this
// bare shell and its own embed layout, never the chrome tree. With no await
// headers() here, the ~36 routes that declare `revalidate` get their static/ISR
// render mode back.
export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  // UX v1: a separate tree (not a `{flag ? <link> : null}` slot) so the flag-off
  // tree, and the RSC payload that describes it, stay exactly today's.
  if (UX_V1) {
    return (
      <html lang="en" className={HTML_CLASS} suppressHydrationWarning {...HTML_SITE_ATTR}>
        <body className="bg-primary text-primary font-sans antialiased">
          <link rel="stylesheet" href={UX_CSS_HREF} precedence="ux-v1" />
          <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
          <ThemeInit />
          <ToastProvider>{children}</ToastProvider>
          <Analytics />
        </body>
      </html>
    );
  }
  return (
    <html lang="en" className={HTML_CLASS} suppressHydrationWarning {...HTML_SITE_ATTR}>
      <body className="bg-primary text-primary font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <ThemeInit />
        <ToastProvider>{children}</ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
