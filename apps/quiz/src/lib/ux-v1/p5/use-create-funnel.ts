'use client';

// P5 (UX v11 create): the EXISTS funnel's state machine for the flag-on view.
// Same effects as components/create/create-funnel.tsx, in the same order and with
// the same calls: restore the localStorage draft on mount, read the session
// (supabase.auth.getUser + the profiles row), resume a publish after the sign-in
// round trip (?resume=publish, plus A0's pending action), debounced autosave (500 ms)
// and step memory, the soft title-dedup check (500 ms), the inline username claim
// (400 ms availability check), publish. The rules and requests live in ./funnel
// (parity-tested against the legacy source).

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  loadDraft, saveDraft, loadStep, saveStep, completeCount, compressImageToDataUrl, validateImageFile,
} from '@/lib/create-draft';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';

import {
  MIN_QUESTIONS, MIN_TITLE, USERNAME_RE, claimUsername, checkUsername, draftToState, emptyState, initialState,
  publishQuiz, questionHasContent, stateToDraft, titleExists, withQuestions, withQuizType,
} from './funnel';

import type { DraftDifficulty } from '@/lib/create-draft';
import type { QuestionData } from '@/lib/quiz-question';
import type { FunnelGroup, FunnelState, PublishedQuiz, UsernameStatus } from './funnel';

/** A0 pending-action id for "Sign in to publish" (16.6: the action continues after auth). */
export const PUBLISH_ACTION = 'p5:publish';

export type Step = 1 | 2 | 3 | 4;

export interface CreateFunnel {
  step: Step;
  data: FunnelState;
  hydrated: boolean;
  signedIn: boolean;
  needsUsername: boolean;
  savedAt: number | null;
  titleDup: boolean;
  typeLocked: boolean;
  nComplete: number;
  coverBusy: boolean;
  coverError: string | null;
  publishing: boolean;
  publishError: string | null;
  published: PublishedQuiz | null;
  username: string;
  unameStatus: UsernameStatus;
  claiming: boolean;
  goStep: (n: Step) => void;
  setTitle: (v: string) => void;
  setNote: (v: string) => void;
  setType: (v: string) => void;
  selectGroup: (slug: string) => void;
  createGroup: (name: string) => void;
  clearGroup: () => void;
  setDifficulty: (v: DraftDifficulty) => void;
  setLanguage: (v: string) => void;
  pickCover: (file: File) => Promise<void>;
  removeCover: () => void;
  setRights: (v: boolean) => void;
  setQuestions: (qs: QuestionData[]) => void;
  setUsername: (v: string) => void;
  publish: () => Promise<void>;
  claimAndPublish: () => Promise<void>;
  reset: () => void;
}

async function browserClient(): Promise<ReturnType<typeof import('@/lib/supabase/client').createBrowserClient>> {
  const { createBrowserClient } = await import('@/lib/supabase/client');
  return createBrowserClient();
}

export function useCreateFunnel(groups: FunnelGroup[], validInitialGroup: string | null): CreateFunnel {
  const [step, setStep] = useState<Step>(1);
  // Seed a deep-linked ?group= into the INITIAL state (SSR + client); a saved draft still overrides it.
  const [data, setData] = useState<FunnelState>(() => initialState(validInitialGroup));
  const [hydrated, setHydrated] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishedQuiz | null>(null);
  const [username, setUsernameRaw] = useState('');
  const [unameStatus, setUnameStatus] = useState<UsernameStatus>('idle');
  const [claiming, setClaiming] = useState(false);
  const [titleDup, setTitleDup] = useState(false);

  const dataRef = useRef(data);
  dataRef.current = data;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const autoPubFired = useRef(false);
  // A0's pending action is read (and cleared) once per mount, so a dev StrictMode
  // double effect cannot lose it between its two runs.
  const pendingRef = useRef<boolean | null>(null);

  const nComplete = completeCount(data.questions, data.quiz_type);
  const typeLocked = data.questions.some(questionHasContent);

  // Soft, NON-blocking title-dedup nudge (never gates publishing).
  useEffect(() => {
    const t = data.title.trim();
    if (t.length < MIN_TITLE) { setTitleDup(false); return; }
    const h = setTimeout(() => { void titleExists(t).then(setTitleDup); }, 500);
    return () => clearTimeout(h);
  }, [data.title]);

  const publish = useCallback(async (): Promise<void> => {
    const outcome = await publishQuiz(dataRef.current, groupsRef.current, () => { setPublishing(true); setPublishError(null); });
    if (outcome.kind === 'blocked') {
      if (outcome.toStep) setStep(outcome.toStep);
      setPublishError(outcome.error);
      return;
    }
    if (outcome.kind === 'failed') {
      setPublishError(outcome.error);
      setPublishing(false);
      return;
    }
    setPublished(outcome.quiz);
    setStep(4);
    setPublishing(false);
  }, []);

  // Mount: restore the draft, read the session, resume a publish after sign-in.
  useEffect(() => {
    const d = loadDraft();
    if (d) setData(draftToState(d, validInitialGroup));
    const params = new URLSearchParams(window.location.search);
    // The legacy return URL (?resume=publish) or A0's pending action (same intent).
    if (pendingRef.current === null) pendingRef.current = takePendingAction(PUBLISH_ACTION) !== null;
    const wantResume = params.get('resume') === 'publish' || pendingRef.current;
    let alive = true;
    void browserClient().then((supabase) => supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!alive) return;
      setSignedIn(!!user);
      let prof: { username: string } | null = null;
      if (user) {
        const { data: p } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
        prof = p;
        setHasProfile(!!p);
      }
      if (wantResume && user && d && completeCount(d.questions, d.quiz_type ?? 'multiple_choice') >= MIN_QUESTIONS) {
        setStep(3);
        // Only auto-publish with a profile; a brand-new account picks a username inline first.
        if (prof && !autoPubFired.current) { autoPubFired.current = true; void publish(); }
      } else if (d) {
        setStep((loadStep() ?? 1) as Step);
      }
      setHydrated(true);
    })).catch(() => { if (alive) setHydrated(true); });
    return () => { alive = false; };
  }, [publish, validInitialGroup]);

  // Inline username availability check (debounced).
  const needsUsername = signedIn && hasProfile === false;
  useEffect(() => {
    if (!needsUsername) return;
    const u = username.trim().toLowerCase();
    if (!u) { setUnameStatus('idle'); return; }
    if (!USERNAME_RE.test(u)) { setUnameStatus('invalid'); return; }
    setUnameStatus('checking');
    const t = window.setTimeout(() => { void checkUsername(u).then(setUnameStatus); }, 400);
    return () => window.clearTimeout(t);
  }, [username, needsUsername]);

  const claimAndPublish = useCallback(async (): Promise<void> => {
    const u = username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) { setUnameStatus('invalid'); return; }
    setClaiming(true);
    setPublishError(null);
    const err = await claimUsername(u);
    if (err) { setPublishError(err); setClaiming(false); return; }
    setHasProfile(true);
    setClaiming(false);
    await publish();
  }, [username, publish]);

  // Debounced autosave (screens 1-3). Not once published: the legacy effect can
  // re-save a draft it has just cleared when publish answers inside the 500 ms window
  // (the resume flow flips `hydrated` right before publishing).
  useEffect(() => {
    if (!hydrated || published) return;
    const t = window.setTimeout(() => { saveDraft(stateToDraft(data)); setSavedAt(Date.now()); }, 500);
    return () => window.clearTimeout(t);
  }, [data, hydrated, published]);

  useEffect(() => { if (hydrated && step <= 3) saveStep(step); }, [step, hydrated]);

  const pickCover = useCallback(async (file: File): Promise<void> => {
    // H9: type + raw size on the client BEFORE compressing; the upload route re-validates at publish.
    const err = validateImageFile(file);
    if (err) { setCoverError(err); return; }
    setCoverError(null);
    setCoverBusy(true);
    try {
      const url = await compressImageToDataUrl(file);
      // A new image resets the rights acknowledgement: it must be confirmed again.
      setData((s) => ({ ...s, cover: url, coverRights: false }));
    } catch {
      setCoverError('That image could not be processed. Please try a different one.');
    } finally {
      setCoverBusy(false);
    }
  }, []);

  const reset = useCallback((): void => {
    setData(emptyState());
    setPublished(null);
    setPublishError(null);
    setUsernameRaw('');
    setUnameStatus('idle');
    autoPubFired.current = false;
    setStep(1);
  }, []);

  return {
    step, data, hydrated, signedIn, needsUsername, savedAt, titleDup, typeLocked, nComplete,
    coverBusy, coverError, publishing, publishError, published, username, unameStatus, claiming,
    goStep: setStep,
    setTitle: (v) => setData((s) => ({ ...s, title: v })),
    setNote: (v) => setData((s) => ({ ...s, creatorNote: v })),
    setType: (v) => setData((s) => withQuizType(s, v)),
    selectGroup: (slug) => setData((s) => ({ ...s, group_slug: slug, newGroup: null })),
    createGroup: (name) => setData((s) => ({ ...s, newGroup: name, group_slug: null })),
    clearGroup: () => setData((s) => ({ ...s, group_slug: null, newGroup: null })),
    setDifficulty: (v) => setData((s) => ({ ...s, difficulty: v })),
    setLanguage: (v) => setData((s) => ({ ...s, language: v })),
    pickCover,
    removeCover: () => { setData((s) => ({ ...s, cover: null, coverRights: false })); setCoverError(null); },
    setRights: (v) => setData((s) => ({ ...s, coverRights: v })),
    setQuestions: (qs) => setData((s) => withQuestions(s, qs)),
    setUsername: (v) => setUsernameRaw(v.toLowerCase()),
    publish, claimAndPublish, reset,
  };
}
