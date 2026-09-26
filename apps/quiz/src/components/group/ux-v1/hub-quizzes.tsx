'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { UxButton } from '@/components/ux-v1/button';
import { UxDropdown } from '@/components/ux-v1/dropdown';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { Segmented } from '@/components/ux-v1/segmented';
import { TextCard, TextCardGrid } from '@/components/ux-v1/text-card';
import { useAnnounce } from '@/components/ux-v1/toast';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import {
  HUB_FIRST_CARDS,
  HUB_SORTS,
  averagePct,
  filterHubQuizzes,
  presentOptions,
  quizzesLabel,
  sortHubQuizzes,
} from '@/lib/ux-v1/p3/model';

import type { HubQuiz, HubSort } from '@/lib/ux-v1/p3/model';

interface HubQuizzesProps {
  groupName: string;
  groupSlug: string;
  /** Every published quiz of the group (its length is the real count). */
  quizzes: HubQuiz[];
  /** The group's published quiz count, when it is known apart from the list. */
  total?: number;
}

const ALL = 'all';

/**
 * "<Group> quizzes" (prototype #hb-qs, DESIGN-SPEC 16.7): sort Popular / Newest /
 * Most liked / Hardest (the live group feed's four orders), Type and Level
 * dropdowns over the types and levels this group really has, 6 text cards, then
 * "Show all N": a real /<slug>-quiz?page=2 link that expands the list in place.
 * The server HTML carries the first 6 of Popular; every quiz of the group also
 * has a crawlable link in the hub's noscript list.
 */
export function HubQuizzes({ groupName, groupSlug, quizzes, total }: HubQuizzesProps): React.ReactElement {
  const uid = useId().replace(/:/g, '');
  const announce = useAnnounce();
  const live = useIsClient();
  const [sort, setSort] = useState<HubSort>('popular');
  const [type, setType] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => presentOptions(quizzes), [quizzes]);
  const list = useMemo(
    () => filterHubQuizzes(sortHubQuizzes(quizzes, sort), { type, level }),
    [quizzes, sort, type, level],
  );
  const shown = expanded ? list : list.slice(0, HUB_FIRST_CARDS);
  const filtered = type !== null || level !== null;

  const changed = (next: HubQuiz[]): void => {
    announce(next.length === 0 ? 'No quizzes match' : `${quizzesLabel(next.length)} shown`);
  };
  const pickSort = (v: HubSort): void => {
    setSort(v);
    changed(filterHubQuizzes(sortHubQuizzes(quizzes, v), { type, level }));
  };
  const pickType = (v: string): void => {
    const t = v === ALL ? null : v;
    setType(t);
    changed(filterHubQuizzes(sortHubQuizzes(quizzes, sort), { type: t, level }));
  };
  const pickLevel = (v: string): void => {
    const l = v === ALL ? null : v;
    setLevel(l);
    changed(filterHubQuizzes(sortHubQuizzes(quizzes, sort), { type, level: l }));
  };
  const clear = (): void => {
    setType(null);
    setLevel(null);
    changed(sortHubQuizzes(quizzes, sort));
  };

  return (
    <section className="ux-sec p3-qs" aria-labelledby={`${uid}-h`} data-live={live || undefined}>
      <SectionHeader id={`${uid}-h`} title={`${groupName} quizzes`} sub={quizzesLabel(Math.max(total ?? 0, quizzes.length))} />
      <div className="p3-qctl">
        <Segmented options={HUB_SORTS} value={sort} onChange={pickSort} label="Sort quizzes" />
        {options.types.length > 1 || options.levels.length > 1 ? (
          <div className="p3-qdd">
            {options.types.length > 1 ? (
              <UxDropdown
                label="Type"
                value={type}
                options={[{ value: ALL, label: 'All types' }, ...options.types]}
                onChange={pickType}
              />
            ) : null}
            {options.levels.length > 1 ? (
              <UxDropdown
                label="Level"
                value={level}
                options={[{ value: ALL, label: 'All levels' }, ...options.levels]}
                onChange={pickLevel}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {list.length === 0 ? (
        <div className="ux-empty">
          {filtered ? (
            <>
              <b>No quizzes match these filters</b>
              Try another type or level.
              <div><UxButton variant="ghost" onClick={clear}>Clear filters</UxButton></div>
            </>
          ) : (
            <>
              <b>No quizzes in this tab yet</b>
              {sort === 'most_liked' ? 'Quizzes show up here once fans like them.' : 'A quiz shows up here after 10 finished plays.'}
            </>
          )}
        </div>
      ) : (
        <div ref={gridRef} id={`${uid}-grid`}>
          <TextCardGrid>
            {shown.map((q) => (
              <TextCard
                key={q.slug}
                href={`/q/${q.slug}`}
                title={q.title}
                quizType={q.quiz_type}
                difficulty={q.difficulty}
                plays={q.play_count}
                averagePct={averagePct(q)}
              />
            ))}
          </TextCardGrid>
        </div>
      )}

      {!expanded && list.length > HUB_FIRST_CARDS ? (
        <div className="p3-all">
          <a
            href={`/${groupSlug}-quiz?page=2`}
            className="ux-btn ux-btn-ghost"
            aria-controls={`${uid}-grid`}
            aria-expanded={false}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              // Render the rest now, then move keyboard focus to the first new card.
              flushSync(() => setExpanded(true));
              gridRef.current?.querySelector<HTMLElement>(`.ux-tcard:nth-child(${HUB_FIRST_CARDS + 1})`)?.focus();
              announce(`${quizzesLabel(list.length)} shown`);
            }}
          >
            Show all {list.length.toLocaleString('en-US')}
          </a>
        </div>
      ) : null}
    </section>
  );
}
