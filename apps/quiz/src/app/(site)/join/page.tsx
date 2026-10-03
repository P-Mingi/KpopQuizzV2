import { notFound } from 'next/navigation';

import { JOIN_DESCRIPTION, LiveJoinPage } from '@/components/live/join-page';
import { isUxV12 } from '@/lib/ux-v12';

import type { Metadata } from 'next';

// /join (SYSTEM.md 5.5): the phone side of a live blindtest. A player types the
// six character code shown on the host screen and a nickname. No account.
// Flag off: the URL does not exist. Flag on: noindex, never in the sitemap.

export function generateMetadata(): Metadata {
  if (!isUxV12()) return {};
  return {
    title: 'Join a live blindtest',
    description: JOIN_DESCRIPTION,
    alternates: { canonical: '/join' },
    robots: { index: false, follow: false },
  };
}

export default function JoinPage(): React.ReactElement {
  if (!isUxV12()) notFound();
  return <LiveJoinPage code={null} />;
}
