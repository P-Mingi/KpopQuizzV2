import '@/styles/globals.css';

import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ToastProvider } from '@/components/ui/toast-provider';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://kpopquizz.com'),
  title: {
    default: 'KpopQuizz - K-pop Quizzes Made by Fans',
    template: '%s | KpopQuizz',
  },
  description:
    'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and 30+ groups. Made by real fans, played by thousands.',
  keywords: ['kpop quiz', 'kpop trivia', 'BTS quiz', 'BLACKPINK quiz', 'Stray Kids quiz', 'kpop game', 'kpop test', 'kpop fan quiz'],
  authors: [{ name: 'KpopQuizz' }],
  creator: 'KpopQuizz',
  publisher: 'KpopQuizz',
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'KpopQuizz',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'KpopQuizz - K-pop Quizzes Made by Fans' }],
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          as="style"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="bg-surface-tertiary text-txt-primary font-sans antialiased">
        <ToastProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-0">
              {children}
            </main>
            <Footer />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
