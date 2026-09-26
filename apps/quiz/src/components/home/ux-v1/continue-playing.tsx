'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { SectionHeader } from '@/components/ux-v1/section-header';
import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { readContinueRuns, resumeHref } from '@/lib/ux-v1/p4/continue';
import { groupInitials } from '@/lib/ux-v1/p1/format';

// The runs the quiz game (P4) saved on this device, read through P4's own module
// (lib/ux-v1/p4/continue.ts, read only) so the home and the quiz page agree on the
// stored format. The snapshot is a string of the fields this row shows, so
// useSyncExternalStore sees a stable value (null on the server, as the first
// client render) and re-reads when another tab changes the storage.
interface Row { slug: string; title: string; groupSlug: string; answered: number; total: number }

function snapshot(): string {
  return JSON.stringify(readContinueRuns().map((e): Row => ({
    slug: e.slug, title: e.title, groupSlug: e.groupSlug, answered: e.answered, total: e.total,
  })));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
}

/**
 * Continue playing (16.7, prototype: signed-in only). Up to 3 unfinished runs, each
 * a real link that resumes at the saved question (P4's resumeHref). A quiz the home
 * already shows elsewhere (`exclude`) is left out ("no quiz appears twice", 16.7).
 * Renders NOTHING for guests or when there is no saved run (min-gate).
 */
export function ContinuePlaying({ exclude = [] }: { exclude?: string[] }): React.ReactElement | null {
  const me = useUxMe();
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const runs = useMemo(() => {
    if (!raw) return [];
    try {
      return (JSON.parse(raw) as Row[]).filter((r) => r.slug && r.total > 0 && r.answered > 0 && r.answered < r.total && !exclude.includes(r.slug));
    } catch {
      return [];
    }
  }, [raw, exclude]);

  if (!me?.profile || runs.length === 0) return null;
  return (
    <section className="ux-sec ux-sec-lg" aria-labelledby="p1-cont-h">
      <SectionHeader id="p1-cont-h" icon="redo" title="Continue playing" />
      <div className="p1-cont">
        {runs.slice(0, 3).map((r) => {
          const photo = groupPhotoUrl(r.groupSlug);
          const pct = Math.round((r.answered / r.total) * 100);
          return (
            <Link key={r.slug} href={resumeHref(r.slug)} className="p1-citem">
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
