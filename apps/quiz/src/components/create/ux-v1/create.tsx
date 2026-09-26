'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { RESUME_RETURN, detailsGate, publishReady } from '@/lib/ux-v1/p5/funnel';
import { PUBLISH_ACTION, useCreateFunnel } from '@/lib/ux-v1/p5/use-create-funnel';
import { detailsStatus, publishStatus, questionsStatus } from '@/lib/ux-v1/p5/view';

import { P5Details } from './details';
import { P5Done } from './done';
import { P5Publish } from './publish';
import { P5Questions } from './questions';

import type { FunnelGroup } from '@/lib/ux-v1/p5/funnel';
import type { Step } from '@/lib/ux-v1/p5/use-create-funnel';
import type { DetailsGate } from '@/lib/ux-v1/p5/funnel';

// UX v11 /create (P5): the EXISTS funnel re-skinned to the prototype's #create view
// (DESIGN-SPEC 14.5, 16.6, 16.7, 17.9). State, gates and save calls come from
// lib/ux-v1/p5 (parity-tested against components/create/create-funnel.tsx).
// SEO lock: the H1 and the intro are the live ones (step 1 is what the server
// renders); later steps keep the live funnel's own per-step heading.

const HEAD: Record<Step, { h1: string; p: string }> = {
  1: { h1: "What's your quiz about?", p: 'No account needed to start. You can change everything later.' },
  2: { h1: 'Your questions', p: 'Add at least 3. Drag to reorder, tap a row to edit, duplicate or delete.' },
  3: { h1: 'Ready to publish?', p: 'Publish it and track how many fans play, like, and beat your score.' },
  4: { h1: 'Your quiz is live!', p: 'Quizzes that get shared get played. Send it to your fandom and see who can beat it.' },
};

const STEPS: { n: 1 | 2 | 3; label: string }[] = [
  { n: 1, label: 'Details' },
  { n: 2, label: 'Questions' },
  { n: 3, label: 'Publish' },
];

const NEXT: Record<1 | 2 | 3, string> = { 1: 'Add questions', 2: 'Review and publish', 3: 'Publish quiz' };

export function P5Create({ groups, initialGroupSlug }: { groups: FunnelGroup[]; initialGroupSlug: string | null }): React.ReactElement {
  const f = useCreateFunnel(groups, initialGroupSlug);
  const signIn = useSignIn();
  const toast = useUxToast();
  const announce = useAnnounce();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef(false);
  // Which step-1 errors are shown (the prototype validates on "Add questions").
  const [shown, setShown] = useState<DetailsGate | null>(null);
  const [publishHint, setPublishHint] = useState<string | null>(null);

  const step = f.step;
  const gate = detailsGate(f.data, groups);
  const ready = publishReady(f.data, groups, f.nComplete);

  // Move to a step (user action): scroll to the top and focus the new heading.
  const go = (n: Step): void => {
    focusNext.current = true;
    setPublishHint(null);
    f.goStep(n);
  };
  const lastStep = useRef<Step>(step);
  useEffect(() => {
    const prev = lastStep.current;
    lastStep.current = step;
    if (prev === step) return;
    // Published (by the button or by the resume after sign-in): say it, show the done state.
    if (step === 4) { toast('Published'); announce('Your quiz is live'); focusNext.current = true; }
    if (!focusNext.current) return;
    focusNext.current = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    h1Ref.current?.focus({ preventScroll: true });
  }, [step, toast, announce]);

  // The legacy step-1 button rule (title 5+, a group, rights confirmed when a cover
  // is set), checked on click: show what is missing and focus the first gap.
  const leaveDetails = (to: 2 | 3): void => {
    if (gate.title && gate.group && gate.rights) { setShown(null); go(to); return; }
    setShown(gate);
    const sel = !gate.title ? '#p5-title' : !gate.group ? '#p5-group-q' : '#p5-rights-w input';
    window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(sel);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: 'center' });
    });
  };

  const onPublish = (): void => {
    if (f.publishing || f.claiming) return;
    if (!ready || (f.data.cover && !f.data.coverRights)) {
      const s = publishStatus(f.data, groups, f.nComplete);
      setPublishHint(`Not ready yet${s.rest}.`);
      return;
    }
    setPublishHint(null);
    if (!f.signedIn) {
      // 16.6: sign-in is asked at Publish; the draft stays in localStorage and the
      // publish continues after the round trip (?resume=publish + A0's pending action).
      signIn({
        title: 'Sign in to publish',
        sub: 'Your quiz needs an owner so you can edit it and see its plays. Your draft is kept.',
        action: { id: PUBLISH_ACTION },
        returnTo: RESUME_RETURN,
      });
      return;
    }
    if (f.needsUsername) {
      // The legacy claim button stays disabled until the handle is available.
      if (f.unameStatus !== 'available') {
        setPublishHint('Pick an available username first.');
        document.getElementById('p5-uname')?.focus();
        return;
      }
      void f.claimAndPublish();
      return;
    }
    void f.publish();
  };

  const onNext = (): void => {
    if (step === 1) leaveDetails(2);
    else if (step === 2) go(3);
    else if (step === 3) onPublish();
  };

  const onStep = (n: 1 | 2 | 3): void => {
    if (n === step || step === 4) return;
    if (n === 1) { go(1); return; }
    if (step === 1) { leaveDetails(n); return; }
    go(n);
  };

  const status = step === 1
    ? detailsStatus(f.data, groups, f.savedAt !== null)
    : step === 2
      ? questionsStatus(f.data.questions, f.data.quiz_type)
      : publishStatus(f.data, groups, f.nComplete);

  const nextLabel = step === 3
    ? (f.publishing || f.claiming ? 'Publishing...' : f.signedIn && f.needsUsername ? 'Claim and publish' : NEXT[3])
    : step === 1 || step === 2 ? NEXT[step] : '';

  return (
    <>
      <div className="ux-col p5-col">
        <header className="ux-ph p5-ph">
          <h1 ref={h1Ref} tabIndex={-1}>{HEAD[step].h1}</h1>
          <p>{HEAD[step].p}</p>
        </header>

        <ol className="p5-stepper" aria-label="Steps">
          {STEPS.map((s) => {
            const state = step === 4 || s.n < step ? 'is-done' : s.n === step ? 'is-on' : '';
            return (
              <li key={s.n} className={['p5-st', state].filter(Boolean).join(' ')}>
                <button type="button" className="p5-st-b" aria-current={s.n === step ? 'step' : undefined} onClick={() => onStep(s.n)} disabled={step === 4}>
                  <span className="p5-st-c" aria-hidden="true">{state === 'is-done' ? <Icon name="check" /> : s.n}</span>
                  <span className="p5-st-l">{s.label}{state === 'is-done' ? <span className="ux-sr"> (done)</span> : null}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {step === 1 ? <P5Details f={f} groups={groups} shown={shown} /> : null}
        {step === 2 ? <P5Questions f={f} /> : null}
        {step === 3 ? <P5Publish f={f} groups={groups} hint={publishHint} goStep={(n) => (n === 1 ? go(1) : go(2))} /> : null}
        {step === 4 && f.published ? <P5Done f={f} onAnother={() => { setShown(null); go(1); f.reset(); }} /> : null}
      </div>

      {step <= 3 ? (
        <div className="p5-bar">
          <div className="ux-col p5-bar-in">
            <p className="p5-stt" data-testid="p5-status">
              <span className={`p5-dot${status.ok ? '' : ' is-warn'}`} aria-hidden="true" />
              <span><b>{status.strong}</b>{status.rest}</span>
            </p>
            {step > 1 ? (
              <button type="button" className="ux-btn ux-btn-ghost" onClick={() => go((step - 1) as Step)}>Back</button>
            ) : null}
            <button type="button" className="ux-btn ux-btn-primary p5-next" onClick={onNext} aria-disabled={f.publishing || f.claiming ? true : undefined}>
              {nextLabel}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
