import '@/styles/globals.css';

import { Suspense } from 'react';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/react';
import { TopNav } from '@/components/layout/top-nav';
import { ThemeInit } from '@/components/layout/theme-init';
import { TopNavSkeleton } from '@/components/layout/top-nav-skeleton';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { Footer } from '@/components/layout/footer';
import { ToastProvider } from '@/components/ui/toast-provider';

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
// native controls/scrollbars match the theme.
export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F5' },
    { media: '(prefers-color-scheme: dark)', color: '#141210' },
  ],
};


const pretendard = localFont({
  src: [
    { path: '../../public/fonts/Pretendard-Regular-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Medium-latin.woff2', weight: '500', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-pretendard',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  adjustFontFallback: 'Arial',
  preload: true,
});

// Canonical / Open Graph base. Use NEXT_PUBLIC_SITE_URL in production, but only
// when it is an absolute https origin - never let a dev value
// (http://localhost:3021) leak into canonical tags. Falls back to the live
// production domain otherwise. All page canonicals are relative and resolve
// against this base.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://kpopquiz.org';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KpopQuiz - Play K-pop Quizzes Made by Fans for Fans',
    template: '%s | KpopQuiz',
  },
  description:
    'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and 30+ groups. Made by real fans, played by thousands.',
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
      'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and 30+ groups. Made by real fans, played by thousands.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'KpopQuiz - Play K-pop Quizzes Made by Fans for Fans' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KpopQuiz - Play K-pop Quizzes Made by Fans for Fans',
    description:
      'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and 30+ groups. Made by real fans, played by thousands.',
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

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html lang="en" className={pretendard.variable} suppressHydrationWarning>
      <body className="bg-primary text-primary font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'KpopQuiz',
              url: 'https://kpopquiz.org',
              logo: 'https://kpopquiz.org/logo-512.png',
              sameAs: ['https://reddit.com/r/Kpop_Verse', 'https://discord.gg/X7AW95WFT'],
            }),
          }}
        />
        <ThemeInit />
        <ToastProvider>
          <div className="flex flex-col min-h-screen">
            <Suspense fallback={<TopNavSkeleton />}>
              <TopNav />
            </Suspense>
            <main className="flex-1 w-full max-w-[720px] mx-auto px-4 sm:px-0 pb-24 md:pb-8">
              {children}
            </main>
            <Footer />
          </div>
          <MobileTabBar />
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
