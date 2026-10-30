'use client';

// Home v3 (2026-10-29, Home.dc.html): "Top fans this week", one board per site with K-pop and Anime tabs (the K-pop board first). The tabs
// only switch which board is shown; a site with no public fan has no tab. A row links to the fan's public page on the hub (/u/<handle>,
// noindex); the signed-in fan's own row is marked. The first fan's initial sits on the colour of the board's site.
import { useState } from 'react';

import { siteClass } from './site-class';

import type { HomeFans as HomeFansData, HomeSite } from '@/lib/site/hub/home-types';

interface HomeFansProps {
  readonly fans: HomeFansData;
  /** The signed-in fan's handle, or null. */
  readonly me: string | null;
  /** `lv` holds `{level}`. */
  readonly labels: { readonly title: string; readonly group: string; readonly kpop: string; readonly anime: string; readonly lv: string };
}

export function HomeFans({ fans, me, labels }: HomeFansProps): React.ReactElement {
  const sites = (['kpop', 'anime'] as const).filter((s) => fans[s].length > 0);
  const [site, setSite] = useState<HomeSite>(sites[0] ?? 'kpop');
  const board = fans[site];
  return (
    <>
      <div className="hub-h2-fans-h">
        <h2 id="top-h" className="hub-h2-h2">{labels.title}</h2>
        {sites.length > 1 ? (
          <div role="group" aria-label={labels.group} className="hub-h2-seg">
            {sites.map((s) => (
              <button key={s} type="button" aria-pressed={site === s ? 'true' : 'false'} className={`hub-h2-segbtn hub-h2-segbtn-site ${siteClass(s)}`} onClick={() => setSite(s)}>
                {s === 'kpop' ? labels.kpop : labels.anime}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <ol className={`hub-h2-lines ${siteClass(site)}`}>
        {board.map((f, i) => (
          <li key={f.handle}>
            <a href={`/u/${encodeURIComponent(f.handle)}`} className={`hub-h2-line hub-h2-fan${me !== null && f.handle === me ? ' hub-h2-fan-me' : ''}`}>
              <span className="hub-h2-fan-rank hub-h2-num">{i + 1}</span>
              <span aria-hidden="true" className={`hub-h2-th hub-h2-fan-av${i === 0 ? ' hub-h2-fan-av-top' : ''}`}>{f.handle.charAt(0).toUpperCase()}</span>
              <span className="hub-h2-fan-name">@{f.handle}</span>
              {f.level !== null ? <span className="hub-h2-fan-lv hub-h2-num">{labels.lv.replace('{level}', String(f.level))}</span> : null}
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}
