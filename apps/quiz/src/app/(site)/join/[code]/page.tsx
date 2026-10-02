import { notFound } from 'next/navigation';

import { JOIN_DESCRIPTION, LiveJoinPage } from '@/components/live/join-page';
import { parseRoomCode } from '@/lib/live/code';
import { isUxV12 } from '@/lib/ux-v12';

import type { Metadata } from 'next';

// /join/<code>: where the QR code of a host screen leads. The code is prefilled;
// the player only types a nickname. A phone that already joined this room (its
// token is in this browser) goes straight back in with its score.
// Flag off: the URL does not exist. Flag on: noindex, never in the sitemap. The
// canonical is /join: a room code is not a page.

export function generateMetadata(): Metadata {
  if (!isUxV12()) return {};
  return {
    title: 'Join a live blindtest',
    description: JOIN_DESCRIPTION,
    alternates: { canonical: '/join' },
    robots: { index: false, follow: false },
  };
}

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }): Promise<React.ReactElement> {
  if (!isUxV12()) notFound();
  const { code } = await params;
  // A code that cannot exist (wrong length, a 0 or an O): the form opens empty.
  return <LiveJoinPage code={parseRoomCode(code)} />;
}
