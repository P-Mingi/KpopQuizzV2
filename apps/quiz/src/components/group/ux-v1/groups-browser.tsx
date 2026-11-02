'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { azBlocks, groupCountLabel, matchGroups, quizzesLabel } from '@/lib/ux-v1/p3/model';

import { GroupAvatar } from './group-avatar';

import type { IndexGroup } from '@/lib/ux-v1/p3/model';

interface GroupsBrowserProps {
  /** Every visible group (90), any order. */
  groups: IndexGroup[];
  /** The "Most played" rail (10). */
  top: IndexGroup[];
}

/**
 * /groups body (prototype #groups, DESIGN-SPEC 16.7): the filter field, "Most
 * played" (hidden while filtering) and the A to Z as on OtakuQuiz's /series
 * (owner, 2026-10-31, CR-015): a bar of letters, then per letter two columns of
 * cards (one on phones) with a square image and the number of quizzes
 * (styles/kpop/groups-az.css, imported by the page). Groups without a quiz are
 * listed muted ("No quiz yet") and open their empty hub. Everything is
 * server-rendered (real <a href> to every hub); the filter only narrows what is
 * shown.
 */
export function GroupsBrowser({ groups, top }: GroupsBrowserProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const uid = useId().replace(/:/g, '');
  const shown = useMemo(() => matchGroups(groups, query), [groups, query]);
  const blocks = useMemo(() => azBlocks(shown), [shown]);
  const filtering = query.trim().length > 0;
  // Hydrated: the filter is live (e2e waits on it).
  const live = useIsClient();

  return (
    <>
      <div className="p3-filter" data-live={live || undefined}>
        <Icon name="search" className="p3-filter-ico" />
        <input
          type="search"
          className="p3-filter-in"
          aria-label="Filter groups"
          aria-controls={`${uid}-az`}
          placeholder={`Filter ${groups.length} groups`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {top.length > 0 ? (
        <section className="ux-sec" hidden={filtering} aria-labelledby={`${uid}-top`}>
          <SectionHeader id={`${uid}-top`} icon="flame" title="Most played" />
          <div className="p3-grail">
            {top.map((g, i) => (
              <Link key={g.slug} href={`/${g.slug}-quiz`} className="p3-gitem">
                <GroupAvatar name={g.name} photo={g.photo} size={80} priority={i < 4} />
                <span className="p3-gitem-n">{g.name}</span>
                <span className="p3-gitem-c ux-num">{quizzesLabel(g.quizzes)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ux-sec" aria-labelledby={`${uid}-az-h`}>
        <SectionHeader
          id={`${uid}-az-h`}
          icon="layers"
          title="A to Z"
          aside={<p className="p3-azcount ux-num" aria-live="polite">{groupCountLabel(shown.length, groups.length)}</p>}
        />
        <div className="p3-az kpop-az" id={`${uid}-az`}>
          {blocks.length === 0 ? (
            <div className="ux-empty">
              <b>No group matches &quot;{query.trim()}&quot;</b>
              Check the spelling, or search quizzes and songs with /.
            </div>
          ) : (
            <>
              <nav className="kpop-az-jump" aria-label="Jump to letter">
                {blocks.map((b) => <a key={b.key} href={`#${b.id}`}>{b.key}</a>)}
              </nav>
              {blocks.map((b) => (
                <div key={b.key} className="p3-azl">
                  {/* Same anchor ids as the live directory (#letter-A ... #letter-other),
                      each letter a self-link so every existing jump target still resolves. */}
                  <h3 id={b.id}><a href={`#${b.id}`}>{b.key}</a></h3>
                  <ul>
                    {b.groups.map((g) => (
                      <li key={g.slug}>
                        <Link href={`/${g.slug}-quiz`} className={g.quizzes > 0 ? 'p3-azr' : 'p3-azr is-zero'}>
                          <GroupAvatar name={g.name} photo={g.photo} size={44} />
                          <span className="kpop-az-text">
                            <span className="p3-azr-n">{g.name}</span>
                            <small className="ux-num">{g.quizzes > 0 ? quizzesLabel(g.quizzes) : 'No quiz yet'}</small>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </>
  );
}
