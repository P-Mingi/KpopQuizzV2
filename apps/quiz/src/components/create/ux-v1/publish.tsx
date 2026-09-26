'use client';

import { Icon } from '@/components/ux-v1/icon';
import { UxQuizCard } from '@/components/ux-v1/quiz-card';
import { TITLE_PLACEHOLDER } from '@/lib/ux-v1/p5/funnel';
import { checklist, leftOutNote } from '@/lib/ux-v1/p5/view';

import type { QuizType } from '@/lib/db/types';
import type { FunnelGroup, FunnelState } from '@/lib/ux-v1/p5/funnel';
import type { CreateFunnel } from '@/lib/ux-v1/p5/use-create-funnel';

// Step 3 (prototype #cp-3): "How it will look" (the quiz card with the draft) and
// the checklist computed from the shared validation (WIRING-MAP 6), then, for a
// signed-in account without a profile, the EXISTS inline username claim. Publishing
// itself is the bar's button (create.tsx): guests get A0's sign-in sheet.

/**
 * The quiz card as it will look, from the draft: A0's UxQuizCard in preview mode (no
 * link, the quiz has no page yet; a data-URL draft cover shown as it is).
 */
export function DraftCard({ data, groups }: { data: FunnelState; groups: FunnelGroup[] }): React.ReactElement {
  const g = groups.find((x) => x.slug === data.group_slug);
  return (
    <UxQuizCard
      preview
      className="p5-card"
      titleAs="p"
      sizes="(max-width: 760px) 280px, 260px"
      quiz={{
        slug: '',
        title: data.title.trim() || TITLE_PLACEHOLDER.replace('e.g. ', ''),
        group_name: g?.name ?? data.newGroup ?? 'K-pop',
        group_slug: g?.slug ?? '',
        quiz_type: data.quiz_type as QuizType,
        difficulty: data.difficulty,
        play_count: 0,
        cover_image_url: data.cover,
      }}
    />
  );
}

export function P5Publish({ f, groups, hint, goStep }: { f: CreateFunnel; groups: FunnelGroup[]; hint: string | null; goStep: (n: 1 | 2) => void }): React.ReactElement {
  const rows = checklist(f.data, groups);
  const note = leftOutNote(f.data);
  return (
    <div className="p5-pane" data-step="3">
      <div className="ux-field p5-pubfield">
        <div className="ux-flabel">How it will look</div>
        <div className="p5-pubgrid">
          <div className="p5-pubcard"><DraftCard data={f.data} groups={groups} /></div>
          <div>
            <ul className="ux-rows p5-checks" aria-label="Checklist">
              {rows.map((r) => (
                <li key={r.id} className="ux-row p5-check" data-ok={r.ok}>
                  <Icon name={r.ok ? 'check' : 'alert'} className={r.ok ? 'p5-ok' : r.warn ? 'p5-w' : 'p5-no'} />
                  <span className="ux-row-grow">{r.label}<span className="ux-sr">{r.ok ? ': done' : r.warn ? ': recommended' : ': missing'}</span></span>
                  <span className="ux-row-end">{r.end}</span>
                  {!r.ok && !r.warn && r.toStep ? (
                    <button type="button" className="ux-lnk p5-fix" onClick={() => goStep(r.toStep!)} aria-label={`Fix: ${r.label}`}>Fix</button>
                  ) : null}
                </li>
              ))}
            </ul>
            {note ? <p className="ux-help p5-note">{note}</p> : null}
          </div>
        </div>
      </div>

      {f.signedIn && f.needsUsername ? (
        <div className="ux-field p5-claim">
          <label htmlFor="p5-uname">Pick a username <small>So fans know who made this quiz</small></label>
          <div className="p5-uname">
            <span aria-hidden="true">@</span>
            <input
              id="p5-uname"
              className="ux-inp"
              value={f.username}
              onChange={(e) => f.setUsername(e.target.value)}
              placeholder="yourname"
              maxLength={20}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="p5-uname-s"
            />
          </div>
          <p id="p5-uname-s" className={`ux-help p5-uname-s is-${f.unameStatus}`} role="status">
            {f.unameStatus === 'checking' ? 'Checking...'
              : f.unameStatus === 'available' ? 'Available'
                : f.unameStatus === 'taken' ? 'Taken, try another'
                  : f.unameStatus === 'invalid' ? '3 to 20 characters: lowercase letters, numbers, underscores'
                    : 'Pick a handle (3 to 20 characters)'}
          </p>
        </div>
      ) : null}

      {hint ? <p className="ux-err p5-pubmsg" role="alert">{hint}</p> : null}
      {f.publishError && f.step === 3 ? <p className="ux-err p5-pubmsg" role="alert">{f.publishError}</p> : null}
    </div>
  );
}
