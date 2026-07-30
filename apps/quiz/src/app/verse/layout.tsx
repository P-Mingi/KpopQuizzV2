import type { Metadata } from 'next';

// V-IDENTITY step 2 (surface: favicon) - a metadata-only layout for the whole
// Verse world. It overrides ONLY the tab favicon (the orbit mark) for /verse/*
// routes; the resolved icons here replace the root's for Verse, while Play routes
// (never under /verse) keep the root favicon byte-for-byte. Apple-touch stays the
// shared PNG for now. Renders children with no wrapper (no visual change).
export const metadata: Metadata = {
  icons: {
    icon: [{ url: '/verse-favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/verse-favicon.svg',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function VerseWorldLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return <>{children}</>;
}
