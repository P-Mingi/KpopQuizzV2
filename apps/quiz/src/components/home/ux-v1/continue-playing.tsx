'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { SectionHeader } from '@/components/ux-v1/section-header';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { CONTINUE_KEY, parseRuns } from '@/lib/ux-v1/p1/continue-store';
import { groupInitials } from '@/lib/ux-v1/p1/format';

import { useNowMs, useStoredValue } from './use-client-values';

/**
 * Continue playing (16.7, prototype: signed-in only). Unfinished runs saved on this
 * device by the quiz player (lib/ux-v1/p1/continue-store.ts), up to 3, each a real
 * link to /q/{slug}. Renders NOTHING for guests or when there is no saved run
 * (min-gate): no empty state is advertised.
 */
export function ContinuePlaying(): React.ReactElement | null {
  const me = useUxMe();
  const raw = useStoredValue(CONTINUE_KEY);
  const now = useNowMs();
  const runs = useMemo(() => (raw && now ? parseRuns(raw, now) : []), [raw, now]);

  if (!me?.profile || runs.length === 0) return null;
  return (
    <section className="ux-sec ux-sec-lg" aria-labelledby="p1-cont-h">
      <SectionHeader id="p1-cont-h" icon="redo" title="Continue playing" />
      <div className="p1-cont">
        {runs.slice(0, 3).map((r) => {
          const photo = groupPhotoUrl(r.groupSlug);
          const pct = Math.round((r.answered / r.total) * 100);
          return (
            <Link key={r.slug} href={`/q/${r.slug}`} className="p1-citem">
              <span className={`p1-cthumb${photo ? '' : ' is-ini'}`} aria-hidden="true">
                {photo
                  ? <Image src={photo} alt="" fill sizes="64px" className="p1-img" />
                  : groupInitials(r.title)}
              </span>
              <span className="p1-grow">
                <span className="ux-rt">{r.title}</span>
                <span className="ux-rs ux-num">{r.answered} of {r.total} answered</span>
                <span className="p1-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
