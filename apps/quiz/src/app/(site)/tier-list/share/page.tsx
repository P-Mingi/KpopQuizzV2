import { ShareSheetClient } from '@/components/tier-list/share-sheet';

import type { Metadata } from 'next';

// The share sheet is a tool page (noindex); the shared image itself is the OG
// route. State travels in ?d= so nothing here needs a database this phase.

interface Props { searchParams: Promise<{ d?: string }> }

function siteBase(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && /^https:\/\//i.test(env)) return env.replace(/\/+$/, '');
  return 'https://kpopquiz.org';
}

// Give a shared link a real unfurl: the og:image is the board's OWN card (the OG
// route for this ?d=), absolute on the public domain, not the site default. The
// page stays noindex; unfurl images are honoured on noindex pages. Without this a
// shared tier list previewed on social with the generic og-default, which read as
// "the share card is grey" (TIERLIST prod hotfix, bug 1).
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { d } = await searchParams;
  const title = 'Share your tier list';
  if (!d) {
    return { title, robots: { index: false, follow: true } };
  }
  const card = `${siteBase()}/api/og/tier-list?d=${d}`;
  return {
    title,
    robots: { index: false, follow: true },
    openGraph: { title, images: [{ url: card, width: 1080, height: 1350 }] },
    twitter: { card: 'summary_large_image', title, images: [card] },
  };
}

export default async function ShareTierListPage({ searchParams }: Props): Promise<React.ReactElement> {
  const { d } = await searchParams;
  return (
    <div className="tl tl-wrap" style={{ maxWidth: 560 }}>
      <div className="tl-kick" style={{ marginBottom: 2 }}>KpopQuiz Tier Lists</div>
      <h1 className="tl-d2">Share your tier list</h1>
      <ShareSheetClient d={d ?? ''} />
    </div>
  );
}
