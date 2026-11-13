// KpopCards: /kpopcards/open/all, /girls, /boys, /solo, /daily (?packs=5 opens five, ?from=shards pays with 50 shards, ?demo=1 is the guest's demo pack). The page is the
// mount of the opening (components/cards/opening-mount.tsx). Not indexed.
import { notFound } from 'next/navigation';

import { OpeningMount } from '@/components/cards/opening-mount';
import { specOf } from '@/lib/cards/kc-open';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Opening a pack', robots: robotsFor(false) };

interface Props { params: Promise<{ theme: string }>; searchParams: Promise<{ packs?: string | string[]; from?: string | string[]; demo?: string | string[] }> }
const one = (v: string | string[] | undefined): string | null => (typeof v === 'string' ? v : null);

export default async function OpenPage({ params, searchParams }: Props): Promise<React.ReactElement> {
  const [{ theme }, q] = await Promise.all([params, searchParams]);
  const spec = specOf({ segments: [theme], packs: one(q.packs), from: one(q.from), demo: one(q.demo) });
  if (!spec) notFound();
  return <OpeningMount spec={spec} />;
}
