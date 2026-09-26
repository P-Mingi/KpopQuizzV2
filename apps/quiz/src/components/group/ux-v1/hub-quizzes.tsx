'use client';

import { useId, useMemo, useRef, useState } from 'react';

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
  /** Every published quiz of the group (its length is the real count). */
  quizzes: HubQuiz[];
}

const ALL = 'all';

function Card({ q }: { q: HubQuiz }): React.ReactElement {
  return (
    <TextCard
      href={`/q/${q.slug}`}
      title={q.title}
      quizType={q.quiz_type}
      difficulty={q.difficulty}
      plays={q.play_count}
      averagePct={averagePct(q)}
    />
  );
}

/**
 * "<Group> quizzes" (prototype #hb-qs, DESIGN-SPEC 16.7): sort Popular / Newest /
 * Most liked / Hardest (the live group feed's four orders), Type and Level
 * dropdowns over the types and levels this group really has, 6 text cards, then
 * "Show all N". Every quiz of the group is a real <a href> in the SERVER HTML:
 * the first 6 as cards, the rest inside a native <details> whose summary is the
 * "Show all N" button (crawlable, and it opens without JavaScript, like P6's
 * "Show all 79 groups"). Nothing lives only in <noscript>.
 */
export function HubQuizzes({ groupName, quizzes }: HubQuizzesProps): React.ReactElement {
  const uid = useId().replace(/:/g, '');
  const announce = useAnnounce();
  const live = useIsClient();
  const [sort, setSort] = useState<HubSort>('popular');
  const [type, setType] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const restRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => presentOptions(quizzes), [quizzes]);
  const list = useMemo(
    () => filterHubQuizzes(sortHubQuizzes(quizzes, sort), { type, level }),
    [quizzes, sort, type, level],
  );
  const first = list.slice(0, HUB_FIRST_CARDS);
  const rest = list.slice(HUB_FIRST_CARDS);
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

  // The native toggle (click, Enter, Space, or no JavaScript at all). Once open the
  // summary hides (the prototype's button goes away) and keyboard focus moves to the
  // first card that just appeared.
  const onToggle = (e: React.SyntheticEvent<HTMLDetailsElement>): void => {
    const open = e.currentTarget.open;
    if (open === expanded) return;
    setExpanded(open);
    if (open) {
      restRef.current?.querySelector<HTMLElement>('.ux-tcard')?.focus();
      announce(`${quizzesLabel(list.length)} shown`);
    }
  };

  return (
    <section className="ux-sec p3-qs" aria-labelledby={`${uid}-h`} data-live={live || undefined}>
      <SectionHeader id={`${uid}-h`} title={`${groupName} quizzes`} sub={quizzesLabel(quizzes.length)} />
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
        <div id={`${uid}-grid`}>
          <TextCardGrid>
            {first.map((q) => <Card key={q.slug} q={q} />)}
          </TextCardGrid>
          {rest.length > 0 ? (
            <details className="p3-more" open={expanded} onToggle={onToggle}>
              <summary className="ux-btn ux-btn-ghost">Show all {list.length.toLocaleString('en-US')}</summary>
              <div ref={restRef}>
                <TextCardGrid>
                  {rest.map((q) => <Card key={q.slug} q={q} />)}
                </TextCardGrid>
              </div>
            </details>
          ) : null}
        </div>
      )}
    </section>
  );
}
