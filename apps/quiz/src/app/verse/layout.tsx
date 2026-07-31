import type { Metadata } from 'next';

// V-IDENTITY step 2 (surface: favicon) - a metadata-only layout for the whole
// Verse world. It overrides ONLY the tab favicon (the orbit mark) for /verse/*
// routes; the resolved icons here replace the root's for Verse, while Play routes
// (never under /verse) keep the root favicon byte-for-byte. Apple-touch stays the
// shared PNG for now. Renders children with no wrapper (no visual change).
export const metadata: Metadata = {
  icons: {
    // The bunny-in-orbit mark (owner-supplied): PNG derivatives, crisp at tab size.
    icon: [
      { url: '/verse/brand/logo-64.png', type: 'image/png', sizes: '64x64' },
      { url: '/verse/brand/logo-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/verse/brand/logo-64.png',
    apple: [{ url: '/verse/brand/logo-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export default function VerseWorldLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return <>{children}</>;
}
