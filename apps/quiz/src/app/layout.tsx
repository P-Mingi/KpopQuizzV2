import '@/styles/globals.css';

import { Suspense } from 'react';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/react';
import { TopNav } from '@/components/layout/top-nav';
import { TopNavSkeleton } from '@/components/layout/top-nav-skeleton';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { Footer } from '@/components/layout/footer';
import { ToastProvider } from '@/components/ui/toast-provider';
import { DailyLoginTracker } from '@/components/layout/daily-login-tracker';

import type { Metadata } from 'next';

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

export const metadata: Metadata = {
  metadataBase: new URL('https://kpopquiz.org'),
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
        <DailyLoginTracker />
        <Analytics />
      </body>
    </html>
  );
}
