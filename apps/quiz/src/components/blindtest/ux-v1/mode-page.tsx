import Link from 'next/link';

import { UxPage } from '@/components/ux-v1/page';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { getGroupSlugFromModeId, isGroupModeId, STATIC_MODES } from '@/lib/blind-test-modes';
import { getPlayableStaticModes, isNamedModePlayable } from '@/lib/blind-test-playlists';
import { getAllGroups } from '@/lib/db/queries/groups';
import { getModePool, isDuplicateMode } from '@/lib/growth/bt-mode-pool';
import { getPlayableGroups, hasDbEnv, settle } from '@/lib/ux-v1/p6/hub-data';
import { modeRun, NAMED_WHEN_PLAYABLE } from '@/lib/ux-v1/p6/modes';
import { isUxV12 } from '@/lib/ux-v12';

import { BtModeControllerLoader, BtModePlayLoader } from './mode-loader';

import type { BlindTestMode } from '@/lib/blind-test-modes';
import type { ModePool } from '@/lib/growth/bt-mode-pool';
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

/**
 * V12 (owner, 2026-10-13: SEO): below the hero, the real pool behind Play (lib/growth/
 * bt-mode-pool.ts), the artists with the most songs in it (linked to their group blindtest
 * when it exists) and the other playlists. All server HTML. Flag off: nothing is added.
 */
function PoolSections({ mode, pool, label, count, groups, others }: {
  mode: BlindTestMode; pool: ModePool; label: string; count: number;
  groups: ReadonlyMap<number, { slug: string; name: string }>; others: readonly BlindTestMode[];
}): React.ReactElement {
  const n = pool.total.toLocaleString('en-US');
  return (
    <>
      <section className="ux-sec" aria-labelledby="p6-pool-h">
        <SectionHeader id="p6-pool-h" title={`What you play in ${mode.title}`} icon="music" />
        <div className="g3-prose">
          <p>
            This blind test draws from the {label} playlist: {n} songs. Each game picks {count} of them, mixing hits everyone
            knows with deeper cuts. You hear a short clip of each song and name the song or the artist before the timer runs out.
          </p>
        </div>
      </section>
      {pool.songs.length > 0 ? (
        <section className="ux-sec" aria-labelledby="p6-songs-h">
          <SectionHeader id="p6-songs-h" title="Songs you could hear" icon="music" sub={`${pool.songs.length} of ${n}`} />
          <ol className="g3-tracks">
            {pool.songs.map((t, i) => (
              <li className="g3-tr" key={`${t.title}-${i}`}><span className="g3-grow"><b>{t.title}</b><span> · {t.artist}</span></span></li>
            ))}
          </ol>
        </section>
      ) : null}
      {pool.artists.length > 0 ? (
        <section className="ux-sec" aria-labelledby="p6-artists-h">
          <SectionHeader id="p6-artists-h" title="Artists with the most songs in it" icon="users" />
          <ul className="g3-links">
            {pool.artists.map((a) => {
              const g = a.groupId != null ? groups.get(a.groupId) : undefined;
              return (
                <li key={`${a.groupId ?? a.name}`}>
                  {g ? <Link href={`/blindtest/group-${g.slug}`} className="ux-lnk">{g.name} blind test</Link> : <b>{a.name}</b>}
                  <span className="ux-muted"> · {a.songs.toLocaleString('en-US')} {a.songs === 1 ? 'song' : 'songs'} here</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {others.length > 0 ? (
        <section className="ux-sec" aria-labelledby="p6-others-h">
          <SectionHeader id="p6-others-h" title="Other blind test playlists" icon="layers" action={{ href: '/blindtest', label: 'All playlists' }} />
          <ul className="g3-links">
            {others.map((m) => <li key={m.id}><Link href={`/blindtest/${m.id}`} className="ux-lnk">{m.title} blind test</Link></li>)}
          </ul>
        </section>
      ) : null}
    </>
  );
}

export async function BlindtestModeV11({ mode }: { mode: BlindTestMode }): Promise<React.ReactElement> {
  const group = isGroupModeId(mode.id) ? await groupState(mode.id) : { playable: true, name: null };
  // F6a: kpop-legends and title-tracks play their own pool (flag on) only when it fills a round;
  // otherwise, or with the flag off (no query), the v11 run below is unchanged.
  const named = NAMED_WHEN_PLAYABLE.includes(mode.id) && hasDbEnv() ? await isNamedModePlayable(mode.id) : false;
  const preset = modeRun(mode.id, group.name, named);
  const playable = group.playable && preset !== null;

  // V12 only: the pool behind Play, the groups to link and the other playlists.
  const v12Pool = isUxV12() && preset && playable && !isGroupModeId(mode.id);
  const [pool, playableGroups, allGroups, playableModes] = v12Pool
    ? await Promise.all([
        getModePool(preset.pick.playlist, true),
        settle<BtGroup[] | null>(() => getPlayableGroups(), null),
        settle(() => getAllGroups(), null),
        settle(() => getPlayableStaticModes(), STATIC_MODES),
      ])
    : [null, null, null, null];
  // An artist links to its group blindtest only when that page exists (a playable group).
  const playableSlugs = new Set((playableGroups?.value ?? []).map((g) => g.slug));
  const groupsById = new Map((allGroups?.value ?? []).filter((g) => playableSlugs.has(g.slug)).map((g) => [g.id, { slug: g.slug, name: g.name }] as const));
  const others = (playableModes?.value ?? []).filter((m) => m.id !== mode.id && !isDuplicateMode(m.id));

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
  const body = pool && preset
    ? <>{page}<PoolSections mode={mode} pool={pool} label={preset.pick.label} count={preset.count} groups={groupsById} others={others} /></>
    : page;

  return (
    <UxPage width="full" padded={false} className="p6">
      {preset
        ? <BtModeControllerLoader preset={preset} shareUrl={`${SITE}/blindtest/${mode.id}`} className={pool ? 'g3-theme' : undefined}>{body}</BtModeControllerLoader>
        : <div className="ux-wrap ux-pg p6-hub p6-mode">{body}</div>}
    </UxPage>
  );
}
