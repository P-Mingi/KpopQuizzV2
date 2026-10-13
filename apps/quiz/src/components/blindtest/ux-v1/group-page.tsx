import Link from 'next/link';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { getGroupTracks, groupBlindtestCopy, groupPages } from '@/lib/growth/bt-group';
import { SITE } from '@/lib/growth/bt-landing';
import { getWmaGroupSlugs } from '@/lib/personality/data';
import { modeRun } from '@/lib/ux-v1/p6/modes';
import { jsonLdScript } from '@/lib/verse/jsonld';

import { BtModeControllerLoader, BtModeErrorLoader, BtThemePlayLoader } from './mode-loader';

import type { BtGroup } from '@/lib/ux-v1/p6/playlists';
import type { Metadata } from 'next';

// A V12 group blindtest page, /blindtest/group-<slug> (owner, 2026-10-13: SEO). The v11
// page held a title and a Play button, 20 to 30 words a crawler could read, on about 90
// URLs. This one is laid out like a themed playlist page (theme-page.tsx): breadcrumb, a
// hero with the real song count, Play, the group's songs (title, album, year), the
// group's other pages that exist, and other group blindtests. Server component:
// everything a crawler reads is in the HTML. Play starts the same v11 run as before
// (lib/ux-v1/p6/modes.ts modeRun). Only rendered for a group with a playable pool.

export function groupBlindtestMetadata(group: BtGroup): Metadata {
  const copy = groupBlindtestCopy(group.name, group.songs);
  const path = `/blindtest/group-${group.slug}`;
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: path },
    openGraph: { title: `${copy.title} | KpopQuiz`, description: copy.description, url: path },
  };
}

function breadcrumb(group: BtGroup): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Blind Test', item: `${SITE}/blindtest` },
      { '@type': 'ListItem', position: 3, name: `${group.name} blind test`, item: `${SITE}/blindtest/group-${group.slug}` },
    ],
  };
}

export async function BlindtestGroupV12({ group, others }: { group: BtGroup; others: readonly BtGroup[] }): Promise<React.ReactElement> {
  const [tracks, wma] = await Promise.all([
    getGroupTracks(group.slug).catch(() => []),
    getWmaGroupSlugs().catch(() => [] as string[]),
  ]);
  const copy = groupBlindtestCopy(group.name, group.songs);
  const modeId = `group-${group.slug}`;
  const preset = modeRun(modeId, group.name);
  const pages = groupPages(group.slug, group.name, wma);
  // Other group blindtests: the biggest pools first, a stable list (no randomness in the HTML).
  const more = [...others].filter((g) => g.slug !== group.slug).sort((a, b) => b.songs - a.songs || a.name.localeCompare(b.name, 'en')).slice(0, 8);

  const page = (
    <>
      <nav className="ux-crumb" aria-label="Breadcrumb">
        <Link href="/blindtest">Blindtest</Link><span aria-hidden="true">/</span><span aria-current="page">{group.name}</span>
      </nav>

      <section className="g3-plhero" aria-labelledby="g3-h1" data-ux="plhero">
        <div className="g3-plcv ux-th-ink" aria-hidden="true">
          <b>{group.name}</b>
          <small>{group.songs.toLocaleString('en-US')} songs</small>
        </div>
        <div>
          <span className="ux-kicker"><Icon name="music" />Group blindtest</span>
          <h1 id="g3-h1">{copy.h1}</h1>
          <p className="g3-lead">{copy.lead}</p>
          <div className="g3-actions">
            {preset ? <BtThemePlayLoader label="Play this blindtest" /> : null}
            <UxButton href="/live" variant="ghost" size="lg" icon="users" prefetch={false}>Play it live</UxButton>
          </div>
          <BtModeErrorLoader />
        </div>
      </section>

      {tracks.length > 0 ? (
        <section className="ux-sec" aria-labelledby="g3-tracks-h">
          <SectionHeader id="g3-tracks-h" title={`${group.name} songs in this blindtest`} icon="music" sub={tracks.length < group.songs ? `${tracks.length} of ${group.songs.toLocaleString('en-US')}` : undefined} />
          <ol className="g3-tracks" id="g3-tracks">
            {tracks.map((t, i) => (
              <li className="g3-tr" key={`${t.title}-${i}`}>
                <span className="g3-grow"><b>{t.title}</b>{t.album || t.year ? <span> · {[t.album, t.year].filter(Boolean).join(', ')}</span> : null}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="ux-sec" aria-labelledby="g3-group-h">
        <SectionHeader id="g3-group-h" title={`More ${group.name} on KpopQuiz`} icon="layers" />
        <ul className="g3-links">
          {pages.map((p) => <li key={p.href}><Link href={p.href} className="ux-lnk">{p.label}</Link></li>)}
        </ul>
      </section>

      {more.length > 0 ? (
        <section className="ux-sec" aria-labelledby="g3-more-h">
          <SectionHeader id="g3-more-h" title="Other group blindtests" icon="music" action={{ href: '/blindtest', label: 'All playlists' }} />
          <ul className="g3-links">
            {more.map((g) => <li key={g.slug}><Link href={`/blindtest/group-${g.slug}`} className="ux-lnk">{g.name} blind test</Link> <span className="ux-muted">· {g.songs.toLocaleString('en-US')} songs</span></li>)}
          </ul>
        </section>
      ) : null}
    </>
  );

  return (
    <UxPage width="full" padded={false} className="p6 g3">
      {jsonLdScript(breadcrumb(group))}
      {preset
        ? <BtModeControllerLoader preset={preset} shareUrl={`${SITE}/blindtest/${modeId}`} challengeLink className="g3-theme">{page}</BtModeControllerLoader>
        : <div className="ux-wrap ux-pg p6-hub p6-mode g3-theme">{page}</div>}
    </UxPage>
  );
}
