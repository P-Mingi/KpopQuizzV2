import Image from 'next/image';

import { UxRow } from '@/components/ux-v1/panel';

import type { CommunityRow } from '@/lib/ux-v1/p1/home-data';

/** From the community (16.7: 3 rows). Real rows only: today's debate, the latest
 *  thread and the latest featured essay of the spaces that opted into the feed. */
export function CommunityRows({ rows }: { rows: CommunityRow[] }): React.ReactElement {
  return (
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
  );
}
