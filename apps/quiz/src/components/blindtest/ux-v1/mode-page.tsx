import Link from 'next/link';

import { UxPage } from '@/components/ux-v1/page';
import { getGroupSlugFromModeId, isGroupModeId } from '@/lib/blind-test-modes';
import { isNamedModePlayable } from '@/lib/blind-test-playlists';
import { getPlayableGroups, hasDbEnv, settle } from '@/lib/ux-v1/p6/hub-data';
import { modeRun, NAMED_WHEN_PLAYABLE } from '@/lib/ux-v1/p6/modes';

import { BtModeControllerLoader, BtModePlayLoader } from './mode-loader';

import type { BlindTestMode } from '@/lib/blind-test-modes';
import type { BtGroup } from '@/lib/ux-v1/p6/playlists';

// A /blindtest/<mode> page under the flag (X1-001). Server component: the page
// keeps today's server-rendered SEO copy (the metadata comes from the route's
// generateMetadata, unchanged; the tags, the H1, the intro, the "10 songs · 10s
// clips" line and the "Back to modes" link are today's text, in today's order),
// and Play starts the v11 day-mode game in place with the same run the hub
// starts for that playlist (lib/ux-v1/p6/modes.ts), instead of the legacy player.

const SITE = 'https://kpopquiz.org';

/**
 * A group mode plays when the group is a playable group playlist (THE rule of
 * lib/blind-test-playlists.ts: >= 10 clean active songs, what generate needs for a
 * round); its real name labels the run. When that read fails the page stays
 * playable under the page's own title (generate decides), so a DB blip never
 * shows a false "not enough songs".
 */
async function groupState(modeId: string): Promise<{ playable: boolean; name: string | null }> {
  const slug = getGroupSlugFromModeId(modeId);
  if (!slug || !hasDbEnv()) return { playable: Boolean(slug), name: null };
  const read = await settle<BtGroup[] | null>(() => getPlayableGroups(), null);
  if (!read.ok || !read.value) return { playable: true, name: null };
  const g = read.value.find((x) => x.slug === slug);
  return g ? { playable: true, name: g.name } : { playable: false, name: null };
}

export async function BlindtestModeV11({ mode }: { mode: BlindTestMode }): Promise<React.ReactElement> {
  const group = isGroupModeId(mode.id) ? await groupState(mode.id) : { playable: true, name: null };
  // F6a: kpop-legends and title-tracks play their own pool (flag on) only when it fills a round;
  // otherwise, or with the flag off (no query), the v11 run below is unchanged.
  const named = NAMED_WHEN_PLAYABLE.includes(mode.id) && hasDbEnv() ? await isNamedModePlayable(mode.id) : false;
  const preset = modeRun(mode.id, group.name, named);
  const playable = group.playable && preset !== null;

  const page = (
    <section className="p6-hero p6-mode-hero" aria-labelledby="p6-h1">
      <div className="p6-bars" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => <i key={i} />)}
      </div>
      <p className="p6-mode-tags"><span>Blind Test</span><span className="p6-mode-lvl">{mode.difficulty}</span></p>
      <h1 id="p6-h1" className="p6-display">{mode.title}</h1>
      {mode.description ? <p className="p6-lead">{mode.description}</p> : null}
      <p className="p6-mode-meta">{mode.song_count} songs · {mode.clip_duration}s clips</p>
      {playable
        ? <BtModePlayLoader />
        : <p className="p6-mode-none">Not enough songs for a {mode.title} round yet.</p>}
      <p className="p6-mode-back"><Link href="/blindtest">Back to modes</Link></p>
    </section>
  );

  return (
    <UxPage width="full" padded={false} className="p6">
      {preset
        ? <BtModeControllerLoader preset={preset} shareUrl={`${SITE}/blindtest/${mode.id}`}>{page}</BtModeControllerLoader>
        : <div className="ux-wrap ux-pg p6-hub p6-mode">{page}</div>}
    </UxPage>
  );
}
