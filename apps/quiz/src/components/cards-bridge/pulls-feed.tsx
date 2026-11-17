// Bunnyverse Cards, lane BRIDGES: the "Card pulls" panel of the community rail, in the shape of "Happening now" (live dot, rows with the time).
// Server component, no client code: the pull is a link to its card on Bunnyverse through the signed-in jump. No picture: names and words only.
import { UxAvatar } from '@/components/ux-v1/avatar';
import { cardsHref } from '@/lib/cards-bridge/links';
import { timeAgo } from '@/lib/ux-v1/p8/format';

import type { Pull } from '@/lib/cards-bridge/pulls';

export function pullsFeed(pulls: readonly Pull[], now: number): React.ReactElement {
  return (
    <section className="ux-panel" aria-labelledby="cb-pulls-h" data-testid="cards-pulls">
      <h2 className="p8-panel-h" id="cb-pulls-h"><span><i className="p8-live-dot" aria-hidden="true" />Card pulls</span><small>Holo and above</small></h2>
      <div className="p8-rows">
        {pulls.map((p) => (
          <div key={`${p.handle}:${p.num}:${p.at}`} className="p8-hn">
            <UxAvatar name={p.handle} src={null} size={28} />
            <span className="p8-hn-t">
              <b>{p.handle}</b>{' pulled a '}{p.label}{' card: '}
              <a className="p8-hn-go" href={cardsHref(`/kpopcards/c/${p.num}`)} rel="nofollow"><b>{p.name}</b>{p.group ? ` (${p.group})` : ''}</a>
              <span className="p8-tm">{timeAgo(p.at, now)}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
