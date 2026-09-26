import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { discordInviteWithUtm } from '@kpopquiz/shared/social-links';

import { UxRow } from '@/components/ux-v1/panel';

import type { CommunityRow, VerseSpaceLink } from '@/lib/ux-v1/p1/home-data';

/** From the community (16.7: 3 rows). Real rows only: today's debate and, while the
 *  Verse is public, the latest thread and featured essay of the spaces that opted
 *  into the feed. Under them, compact lines that keep the live home's community
 *  links: the "Fandom spaces on Verse" links (while the Verse is public) and the
 *  two Discord links. */
export function CommunityRows({ rows, spaces = [] }: { rows: CommunityRow[]; spaces?: VerseSpaceLink[] }): React.ReactElement {
  return (
    <>
      {rows.length > 0 ? (
        <div className="ux-rows">
          {rows.map((r) => (
            <UxRow
              key={`${r.kind}-${r.href}`}
              href={r.href}
              lead={(
                <span className={`ux-gav p1-cav${r.avatar.photo ? '' : ' is-ini'}`} aria-hidden="true">
                  {r.avatar.photo ? <Image src={r.avatar.photo} alt="" fill sizes="40px" className="p1-img" /> : r.avatar.initials}
                </span>
              )}
              title={r.title}
              sub={r.sub}
            />
          ))}
        </div>
      ) : null}
      {spaces.length > 0 ? (
        <p className="p1-spaces">
          <span>Fandom spaces on Verse:</span>{' '}
          {spaces.map((s, i) => (
            <Fragment key={s.slug}>
              <Link href={`/verse/${s.slug}`} className="ux-lnk" aria-label={`${s.label}, the ${s.name} space`}>{s.label}</Link>
              {i < spaces.length - 1 ? <i aria-hidden="true">·</i> : null}
            </Fragment>
          ))}
          <i aria-hidden="true">·</i>
          <Link href="/verse" className="ux-lnk">Explore Verse</Link>
        </p>
      ) : null}
      {/* The live home's two Discord links (the community strip and the daily
          quiz line), same invite and utm campaigns, in one compact line. */}
      <p className="p1-spaces">
        <span>On Discord:</span>{' '}
        <a href={discordInviteWithUtm('home-strip')} className="ux-lnk" target="_blank" rel="noopener noreferrer">Kpop Quiz on Discord</a>
        <i aria-hidden="true">·</i>
        <a href={discordInviteWithUtm('daily')} className="ux-lnk" target="_blank" rel="noopener noreferrer">Today&apos;s quiz is in the Discord too</a>
      </p>
    </>
  );
}
