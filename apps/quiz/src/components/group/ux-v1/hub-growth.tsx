import Link from 'next/link';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { WaysTile, WaysTiles } from '@/components/ux-v1/ways-tile';
import {
  HUB_QUIZZES_ID,
  firstSignals,
  fansPickedTitle,
  hubTemplates,
  thinNudge,
  waysToPlay,
} from '@/lib/ux-v1/p3/growth';
import { getHubGrowth } from '@/lib/ux-v1/p3/growth-data';

import { HubFansPickedLoader } from './loader';

interface HubGrowthProps {
  group: { id: number; slug: string; name: string; fandom_name: string | null };
  /** Published quizzes of the group (the hub's own fail-closed count). */
  published: number;
  /** Playable blindtest songs of the group (the hub's own read). */
  songs: number;
  /** The v11 quizzes list, exactly as the v11 hub renders it (null on an empty hub). */
  children: React.ReactNode;
}

/**
 * The v12 additions of the group hub (SYSTEM.md 5.4, prototype hubGrowth()), in
 * the prototype's order: "Be the first" or the thin hub nudge, Ways to play, the
 * v11 quizzes list (passed through untouched), then "<Fandom> picked".
 *
 * Mounted by hub.tsx only when isUxV12(), in the slot of the v11 quizzes list, so
 * the v11-only tree keeps its exact shape (and its useId values). Server
 * component: every block is in the HTML. Additions only: the H1, intro, FAQ,
 * JSON-LD and every v11 link are hub.tsx's and do not pass through here.
 */
export async function HubGrowth({ group: g, published, songs, children }: HubGrowthProps): Promise<React.ReactElement> {
  const d = await getHubGrowth(g, published, songs);
  const tiles = waysToPlay(d.ways);
  const nudge = thinNudge({ slug: g.slug, name: g.name, fandom: g.fandom_name, quizzes: published, plays: d.recentPlays });
  const empty = published <= 0;
  const templates = empty ? hubTemplates(g.slug) : [];
  const picked = d.fansPicked;

  return (
    <>
      {empty ? (
        <section className="g8-fcreate" aria-labelledby="g8-first-h" data-testid="hub-first">
          <div>
            <span className="ux-kicker"><Icon name="pen" />Fans create</span>
            <h2 id="g8-first-h">No {g.name} quiz yet. Be the first.</h2>
            <p>The first {g.name} quiz opens this page for every fan who searches for one.</p>
            <ul>
              {firstSignals({ name: g.name, songs, btPlays: d.btPlays }).map((s) => (
                <li key={s.text}><Icon name={s.icon} /><span>{s.text}</span></li>
              ))}
            </ul>
            <div className="g8-fcreate-a">
              <UxButton href={`/create?group=${g.slug}`} size="lg" icon="plus">Create the first {g.name} quiz</UxButton>
            </div>
          </div>
          <div className="g8-tpls">
            <p className="g8-tpls-h">Start from a template</p>
            {templates.map((t) => (
              <Link key={t.type} href={t.href} className="g8-tpl" prefetch={false}>
                <span className="g8-tpl-ic"><Icon name={t.icon} /></span>
                <span><b>{t.title}</b><small>{t.sub}</small></span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {nudge ? (
        <section className="g8-nudge" aria-label={`Make the next ${g.name} quiz`} data-testid="hub-nudge">
          <Icon name="pen" className="g8-nudge-ic" />
          <div className="g8-nudge-t">
            <b>{nudge.title}</b>
            <p>{nudge.body}</p>
          </div>
          <UxButton href={nudge.href}>Create a quiz</UxButton>
        </section>
      ) : null}

      {tiles.length > 0 ? (
        <section className="ux-sec g8-ways" aria-labelledby="g8-ways-h" data-testid="hub-ways">
          <SectionHeader id="g8-ways-h" title="Ways to play" icon="play" />
          <WaysTiles>
            {tiles.map((t) => (
              <WaysTile key={t.key} href={t.href} icon={t.icon} title={t.title} isNew={t.isNew} foot={t.foot}>{t.body}</WaysTile>
            ))}
          </WaysTiles>
        </section>
      ) : null}

      {children ? (
        <div id={HUB_QUIZZES_ID} className="g8-qs">
          {children}
          {d.firstCreator ? (
            <p className="p3-note g8-firstby">
              The first {g.name} quiz was made by <Link href={d.firstCreator.href} prefetch={false}>{d.firstCreator.username}</Link>.
            </p>
          ) : null}
        </div>
      ) : null}

      {picked ? (
        <HubFansPickedLoader
          groupSlug={g.slug}
          groupName={g.name}
          title={fansPickedTitle(g.fandom_name)}
          votes={picked.votes}
          hasMovement={picked.hasMovement}
          songs={picked.songs.map((s) => ({ id: s.id, rank: s.rank, title: s.title, year: s.year, votes: s.votes, movement: s.movement, isNew: s.isNew }))}
        />
      ) : null}
    </>
  );
}
