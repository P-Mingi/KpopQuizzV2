import { ShareSheetClient } from '@/components/tier-list/share-sheet';

import type { Metadata } from 'next';

// The share sheet is a tool page (noindex); the shared image itself is the OG
// route. State travels in ?d= so nothing here needs a database this phase.
export const metadata: Metadata = {
  title: 'Share your tier list',
  robots: { index: false, follow: true },
};

interface Props { searchParams: Promise<{ d?: string }> }

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
