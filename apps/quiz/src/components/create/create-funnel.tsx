'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createBrowserClient } from '@/lib/supabase/client';
import { QuizCard } from '@/components/ui/quiz-card';
import { copyShareLink } from '@/lib/share';
import { ShareCardModal, type SharePlatform } from '@/components/share/share-card-modal';
import { Mascot } from '@/components/ui/mascot';
import {
  type Draft, type DraftQuestion, type DraftDifficulty, blankQuestion, isQuestionComplete, completeCount,
  loadDraft, saveDraft, clearDraft, loadStep, saveStep, compressImageToDataUrl, dataUrlToFile,
  validateImageFile, ACCEPTED_IMAGE_TYPES,
} from '@/lib/create-draft';
import { GroupPicker } from './group-picker';
import { LANGUAGES, detectBrowserLanguage } from '@/lib/languages';
import { QuestionListEditor, type QuestionData } from '@/components/quiz/question-list-editor';
import { creatorNudge, type CreatorStats } from '@/lib/creator-progress';
import { languageChip } from '@/lib/languages';

import type { QuizCardData } from '@/lib/db/types';

// ============================================================
// Wired creation funnel (H1-H4, H10). localStorage draft -> publish via the
// existing /api/quiz/create, claiming the draft onto the session user after auth.
// This IS /create (the H10 swap retired the old editor). Anyone can build
// screens 1-2 with no account; auth is only required at publish, and the draft
// survives the OAuth round-trip so nothing is lost. B0 tokens, DM Sans.
// ============================================================

export interface FunnelGroup {
  id: number;
  name: string;
  slug: string;
  display_color: string;
  text_color: string;
  logo_url: string | null;
  fandom_name: string;
}

const TITLE_PLACEHOLDER = 'e.g. Only real ITZY stans can pass this';
const MIN_QUESTIONS = 3; // I1: publish floor lowered 5 -> 3 (matches /api/quiz/create + the DB constraint)
const MIN_TITLE = 5;
const RESUME_RETURN = '/create?resume=publish';

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M15.5 8.2c0-.6-.1-1-.2-1.5H8v2.8h4.2c-.2.9-.7 1.7-1.4 2.2v1.8h2.3c1.4-1.2 2.2-3.1 2.2-5.3z" fill="#4285F4" /><path d="M8 16c2.2 0 4-.7 5.3-2l-2.3-1.8c-.7.5-1.6.8-2.9.8-2.2 0-4.1-1.5-4.8-3.5H.8v1.9C2.2 14.1 4.9 16 8 16z" fill="#34A853" /><path d="M3.2 9.5c-.2-.5-.3-1-.3-1.5s.1-1 .3-1.5V4.6H.8C.3 5.6 0 6.8 0 8s.3 2.4.8 3.4l2.4-1.9z" fill="#FBBC05" /><path d="M8 3.2c1.3 0 2.4.4 3.3 1.3l2.4-2.4C12 .8 10.2 0 8 0 4.9 0 2.2 1.9.8 4.6l2.4 1.9C4 4.6 5.8 3.2 8 3.2z" fill="#EA4335" /></svg>
);
const DiscordIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="#fff" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>
);

const DIFFICULTIES: { value: DraftDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

interface FunnelState {
  title: string;
  group_slug: string | null;
  newGroup: string | null; // Q-B1: a brand-new custom group name (sent as group_name at publish)
  difficulty: DraftDifficulty; // Q-B1: creator-selectable (was hardcoded 'medium')
  language: string; // Q-B2: language the quiz is written in
  cover: string | null;
  coverRights: boolean; // H9: "I have the right to use this image"
  questions: DraftQuestion[];
}

// 'en' is the SSR-safe seed; the real browser-locale default is applied in the
// mount effect (navigator is client-only), and a saved draft always wins.
function emptyState(): FunnelState {
  return { title: '', group_slug: null, newGroup: null, difficulty: 'medium', language: 'en', cover: null, coverRights: false, questions: [blankQuestion()] };
}

export function CreateFunnel({ groups, initialGroupSlug }: { groups: FunnelGroup[]; initialGroupSlug?: string | null }): React.ReactElement {
  // H10: /create?group=<slug> deep-links pre-select a group on Screen 1. Ignored
  // if the slug is unknown. A saved draft's own group always wins over this.
  const validInitialGroup = initialGroupSlug && groups.some((g) => g.slug === initialGroupSlug) ? initialGroupSlug : null;

  const [step, setStep] = useState(1);
  // Q-B3: step 2 is a full list editor (no more one-at-a-time index).
  // Seed a deep-linked ?group= into the INITIAL state so the chip is selected on
  // the very first render (SSR + client), not after a post-hydration effect. A
  // saved draft (loaded in the mount effect below) still overrides it.
  const [data, setData] = useState<FunnelState>(() => (validInitialGroup ? { ...emptyState(), group_slug: validInitialGroup } : emptyState()));
  const [hydrated, setHydrated] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null); // H9: size/format feedback
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const [published, setPublished] = useState<{ id: string; slug: string; creator_stats?: CreatorStats | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareModal, setShareModal] = useState<SharePlatform | null>(null);
  // I1 inline username: a signed-in user with no profile picks one here (no /onboarding redirect).
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [unameStatus, setUnameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [claiming, setClaiming] = useState(false);

  const dataRef = useRef(data);
  dataRef.current = data;
  const autoPubFired = useRef(false);

  const group = groups.find((g) => g.slug === data.group_slug) ?? null;
  const hasGroup = !!group || !!data.newGroup;
  const displayTitle = data.title.trim() || TITLE_PLACEHOLDER.replace('e.g. ', '');
  const nComplete = completeCount(data.questions);
  const ready = data.title.trim().length >= MIN_TITLE && hasGroup && nComplete >= MIN_QUESTIONS;

  // --- publish (claim draft onto the session user) ---
  const publish = useCallback(async () => {
    const d = dataRef.current;
    const g = groups.find((x) => x.slug === d.group_slug);
    const complete = d.questions.filter(isQuestionComplete);
    const hasG = !!g || !!(d.newGroup && d.newGroup.trim().length >= 2);
    if (!hasG || d.title.trim().length < MIN_TITLE || complete.length < MIN_QUESTIONS) {
      setPublishError(`Add a title (${MIN_TITLE}+ chars), pick a group, and complete at least ${MIN_QUESTIONS} questions.`);
      return;
    }
    // H9: a cover can only be published once the user confirms they may use it.
    if (d.cover && !d.coverRights) {
      setStep(1);
      setPublishError('Please confirm you have the right to use your cover image (on the first step).');
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      // 1. upload the cover (held as a data URL) now that we are authed
      let coverUrl: string | undefined;
      if (d.cover) {
        if (d.cover.startsWith('data:')) {
          const file = await dataUrlToFile(d.cover);
          const fd = new FormData();
          fd.append('file', file);
          const up = await fetch('/api/quiz/upload-image', { method: 'POST', body: fd });
          const upData = (await up.json()) as { url?: string; error?: string };
          if (up.ok && upData.url) coverUrl = upData.url;
        } else {
          coverUrl = d.cover;
        }
      }
      // 2. create the quiz via the existing route. An existing group sends
      //    group_id; a brand-new custom group sends group_name, which the route
      //    resolves/creates via the existing is_custom path (create/route.ts).
      const payload = {
        ...(g ? { group_id: g.id } : { group_name: (d.newGroup ?? '').trim() }),
        title: d.title.trim(),
        quiz_type: 'multiple_choice' as const,
        difficulty: d.difficulty,
        language: d.language,
        cover_image_url: coverUrl,
        questions: complete.map((q) => ({
          question: q.question.trim(),
          options: q.answers.map((a) => a.trim()),
          correct: q.correctIndex,
          ...(q.funFact && q.funFact.trim()
            ? { fun_fact: q.funFact.trim() }
            : {}),
        })),
        settings: { timer: true, timer_seconds: 15, shuffle: false, show_answers: true },
      };
      const res = await fetch('/api/quiz/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string; details?: string[] };
        setPublishError(err.details?.join(' ') ?? err.error ?? 'Could not publish. Try again.');
        setPublishing(false);
        return;
      }
      const out = (await res.json()) as { id: string; slug: string; creator_stats?: CreatorStats | null };
      clearDraft();
      setPublished(out);
      setStep(4);
    } catch {
      setPublishError('Could not publish. Check your connection and try again.');
    } finally {
      setPublishing(false);
    }
  }, [groups]);

  // --- mount: restore draft, check auth, resume-after-OAuth ---
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      // A saved draft wins; if it had no group, fall back to the deep-linked one.
      // Old-format drafts predate newGroup/difficulty/language, so all default safely.
      setData({ title: d.title, group_slug: d.group_slug ?? validInitialGroup, newGroup: d.newGroup ?? null, difficulty: d.difficulty ?? 'medium', language: d.language ?? 'en', cover: d.cover, coverRights: d.coverRights ?? false, questions: d.questions.length ? d.questions : [blankQuestion()] });
    } else {
      // No saved draft: default the language from the browser locale (client-only).
      setData((s) => ({ ...s, language: detectBrowserLanguage() }));
    }
    // No draft: the useState initializer already seeded validInitialGroup.
    const params = new URLSearchParams(window.location.search);
    const wantResume = params.get('resume') === 'publish';
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setSignedIn(!!user);
      let prof: { username: string } | null = null;
      if (user) {
        const { data: p } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle();
        prof = p;
        setHasProfile(!!p);
      }
      if (wantResume && user && d && completeCount(d.questions) >= MIN_QUESTIONS) {
        setStep(3);
        // Only auto-publish if they already have a profile; a brand-new account
        // picks a username inline first (no /onboarding redirect).
        if (prof && !autoPubFired.current) { autoPubFired.current = true; void publish(); }
      } else if (d) {
        setStep(loadStep() ?? 1);
      }
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, [publish, validInitialGroup]);

  // --- inline username availability check (debounced) ---
  const needsUsername = signedIn && hasProfile === false;
  useEffect(() => {
    if (!needsUsername) return;
    const u = username.trim().toLowerCase();
    if (!u) { setUnameStatus('idle'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setUnameStatus('invalid'); return; }
    setUnameStatus('checking');
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(u)}`);
        const j = (await res.json()) as { available?: boolean };
        setUnameStatus(j.available ? 'available' : 'taken');
      } catch {
        setUnameStatus('idle');
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [username, needsUsername]);

  const claimAndPublish = useCallback(async () => {
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setUnameStatus('invalid'); return; }
    setClaiming(true);
    setPublishError(null);
    try {
      const res = await fetch('/api/auth/create-profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) { setPublishError(j.error ?? 'Could not claim that username.'); setClaiming(false); return; }
      setHasProfile(true);
    } catch {
      setPublishError('Could not claim username. Try again.');
      setClaiming(false);
      return;
    }
    setClaiming(false);
    await publish();
  }, [username, publish]);

  // --- debounced autosave (screens 1-2) ---
  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      const d: Omit<Draft, 'updatedAt'> = { title: data.title, group_slug: data.group_slug, newGroup: data.newGroup, difficulty: data.difficulty, language: data.language, cover: data.cover, coverRights: data.coverRights, questions: data.questions };
      saveDraft(d);
    }, 500);
    return () => window.clearTimeout(t);
  }, [data, hydrated]);

  useEffect(() => { if (hydrated && step <= 3) saveStep(step); }, [step, hydrated]);

  // --- helpers ---
  // Q-B3: the funnel persists the compact DraftQuestion shape (localStorage +
  // OAuth survival unchanged), and bridges to the shared QuestionData model the
  // list editor speaks. Create is multiple_choice only, so options are strings.
  const draftToEditor = (dq: DraftQuestion): QuestionData => ({
    question: dq.question,
    options: [...dq.answers],
    correct: dq.correctIndex,
    fun_fact: dq.funFact ?? '',
  });
  const editorToDraft = (qd: QuestionData): DraftQuestion => {
    const opts = (Array.isArray(qd.options) ? qd.options : []) as string[];
    return {
      question: qd.question,
      answers: [opts[0] ?? '', opts[1] ?? '', opts[2] ?? '', opts[3] ?? ''],
      correctIndex: typeof qd.correct === 'number' ? qd.correct : null,
      funFact: qd.fun_fact ?? '',
    };
  };
  const handleQuestionsChange = (qs: QuestionData[]): void =>
    setData((s) => ({ ...s, questions: qs.length ? qs.map(editorToDraft) : [blankQuestion()] }));

  const pickCover = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_IMAGE_TYPES.join(',');
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      // H9: validate type + raw size on the client (instant feedback) BEFORE we
      // compress. The upload route re-validates authoritatively at publish.
      const err = validateImageFile(file);
      if (err) { setCoverError(err); return; }
      setCoverError(null);
      setCoverBusy(true);
      try {
        const url = await compressImageToDataUrl(file);
        // A new image resets the rights acknowledgement - it must be re-confirmed.
        setData((s) => ({ ...s, cover: url, coverRights: false }));
      } catch {
        setCoverError('That image could not be processed. Please try a different one.');
      } finally {
        setCoverBusy(false);
      }
    };
    input.click();
  };

  const signInWith = async (provider: 'google' | 'discord') => {
    const supabase = createBrowserClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${origin}/auth/callback?returnTo=${encodeURIComponent(RESUME_RETURN)}` } });
  };
  const signInEmail = async () => {
    if (!email.trim()) return;
    const supabase = createBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${origin}/auth/callback?returnTo=${encodeURIComponent(RESUME_RETURN)}` } });
    if (!error) setEmailSent(true);
  };

  const previewQuiz: QuizCardData = {
    id: 'preview', title: displayTitle, slug: 'preview', quiz_type: 'multiple_choice', difficulty: data.difficulty, language: data.language as QuizCardData['language'],
    play_count: 0, total_score_sum: 0, total_completions: 0, like_count: 0, created_at: new Date().toISOString(),
    group_name: group?.name ?? data.newGroup ?? 'K-pop', group_slug: group?.slug ?? '', display_color: group?.display_color ?? '#E8457A',
    text_color: group?.text_color ?? '#FFFFFF', logo_url: group?.logo_url ?? null, fandom_name: group?.fandom_name ?? 'fan',
    creator_username: 'you', creator_avatar_url: null, creator_avatar_bg: '#ED93B1', creator_avatar_text: '#FFFFFF',
    question_count: data.questions.length, cover_image_url: data.cover,
  };

  const editorQuestions = data.questions.map(draftToEditor);
  const quizUrl = published ? `${typeof window !== 'undefined' ? window.location.origin : 'https://kpopquiz.org'}/q/${published.slug}` : '';

  return (
    <div className="cf-screen">
      {step <= 3 && (
        <div className="cf-top">
          <span className="cf-eyebrow">{step === 1 ? 'Create a quiz · details' : step === 2 ? 'Create a quiz · questions' : 'Create a quiz · publish'}</span>
          <div className="cf-progress" role="img" aria-label={`Step ${step} of 4`}>
            {[1, 2, 3, 4].map((d) => (<span key={d} className={`cf-dot${d === step ? ' active' : d < step ? ' done' : ''}`} />))}
          </div>
        </div>
      )}

      {/* ===================== SCREEN 1 - SETUP ===================== */}
      {step === 1 && (
        <div className="cf-body">
          <h1 className="cf-head">What&apos;s your quiz about?</h1>
          <p className="cf-sub">No account needed to start. You can change everything later.</p>

          <div className="cf-field">
            <label className="cf-label" htmlFor="cf-title">Quiz title</label>
            <input id="cf-title" className="cf-input" value={data.title} onChange={(e) => setData((s) => ({ ...s, title: e.target.value }))} placeholder={TITLE_PLACEHOLDER} maxLength={100} />
          </div>

          <div className="cf-field">
            <span className="cf-label" id="cf-group-label">Group</span>
            <GroupPicker
              groups={groups}
              selectedSlug={data.group_slug}
              customGroup={data.newGroup}
              onSelect={(slug) => setData((s) => ({ ...s, group_slug: slug, newGroup: null }))}
              onCreateCustom={(name) => setData((s) => ({ ...s, newGroup: name, group_slug: null }))}
              onClear={() => setData((s) => ({ ...s, group_slug: null, newGroup: null }))}
            />
          </div>

          <div className="cf-field">
            <span className="cf-label">Difficulty</span>
            <div className="cf-segmented" role="group" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={`cf-seg${data.difficulty === d.value ? ' on' : ''}`}
                  aria-pressed={data.difficulty === d.value}
                  onClick={() => setData((s) => ({ ...s, difficulty: d.value }))}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cf-field">
            <label className="cf-label" htmlFor="cf-language">Language</label>
            <div className="cf-select-wrap">
              <select
                id="cf-language"
                className="cf-select"
                value={data.language}
                onChange={(e) => setData((s) => ({ ...s, language: e.target.value }))}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label === l.native ? l.label : `${l.label} (${l.native})`}
                  </option>
                ))}
              </select>
              <svg className="cf-select-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </div>
            <p className="cf-cover-help">The language your questions are written in.</p>
          </div>

          <div className="cf-field">
            <span className="cf-label">Cover image <span className="cf-rec">Recommended</span></span>
            <button type="button" className={`cf-cover${data.cover ? ' filled' : ''}`} onClick={pickCover} style={data.cover ? { backgroundImage: `url(${data.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} aria-label={data.cover ? 'Change cover image' : 'Add a cover image'}>
              {coverBusy ? (<span className="cf-cover-empty"><span className="bt-spinner" style={{ borderTopColor: 'var(--brand)', borderColor: 'var(--border)' }} /></span>)
                : data.cover ? (<span className="cf-cover-change">Change</span>)
                : (<span className="cf-cover-empty"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg><span>Tap to add a cover</span></span>)}
            </button>
            <p className="cf-cover-help">A cover makes your quiz yours, it is the first thing fans see. Shows on your quiz card and becomes your share card background.</p>
            <p className="cf-cover-help">JPG, PNG, or WebP, up to 5MB.</p>
            {coverError && <p className="cf-cover-err" role="alert">{coverError}</p>}
            {data.cover && (
              <label className={`cf-rights${data.coverRights ? ' on' : ''}`}>
                <input
                  type="checkbox"
                  checked={data.coverRights}
                  onChange={(e) => setData((s) => ({ ...s, coverRights: e.target.checked }))}
                />
                <span>I have the right to use this image (it&apos;s mine, royalty-free, or properly licensed).</span>
              </label>
            )}
            {data.cover && <button type="button" className="cf-skip" onClick={() => { setData((s) => ({ ...s, cover: null, coverRights: false })); setCoverError(null); }}>Remove cover</button>}
          </div>

          <button type="button" className="cf-cta" disabled={data.title.trim().length < MIN_TITLE || !hasGroup || (!!data.cover && !data.coverRights)} onClick={() => setStep(2)}>Start adding questions &rarr;</button>
          {data.title.trim().length < MIN_TITLE
            ? <p className="cf-mini-hint">Add a title ({MIN_TITLE}+ characters) to continue.</p>
            : !hasGroup
            ? <p className="cf-mini-hint">Pick a group to continue.</p>
            : (!!data.cover && !data.coverRights) && <p className="cf-mini-hint">Confirm you have the right to use your cover image to continue.</p>}
        </div>
      )}

      {/* ===================== SCREEN 2 - QUESTIONS ===================== */}
      {step === 2 && (
        <div className="cf-body">
          <h1 className="cf-head">Your questions</h1>
          <p className="cf-sub">Add at least {MIN_QUESTIONS}. Drag to reorder, tap a row to edit, duplicate or delete.</p>

          <QuestionListEditor
            questions={editorQuestions}
            quizType="multiple_choice"
            onChange={handleQuestionsChange}
          />

          <button type="button" className="cf-cta" onClick={() => setStep(3)}>Done &rarr;</button>
          {nComplete >= MIN_QUESTIONS ? (
            <p className="cf-publish-now" role="status">You can publish now ({nComplete} question{nComplete === 1 ? '' : 's'}), or keep adding.</p>
          ) : (
            <p className="cf-mini-hint">{nComplete} of {MIN_QUESTIONS}+ questions ready to publish</p>
          )}
          <button type="button" className="cf-ghost" onClick={() => setStep(1)}>&larr; Back to details</button>
        </div>
      )}

      {/* ===================== SCREEN 3 - PUBLISH + AUTH ===================== */}
      {step === 3 && (
        <div className="cf-body">
          <h1 className="cf-head">Ready to publish?</h1>
          <p className="cf-sub">Publish it and track how many fans play, like, and beat your score.</p>

          <div className="cf-preview-wrap">
            <span className="cf-preview-tag">Live preview</span>
            <div className="cf-preview-card"><QuizCard quiz={previewQuiz} showScore={false} /></div>
          </div>

          <dl className="cf-summary" aria-label="Quiz summary">
            <div className="cf-summary-row"><dt>Title</dt><dd>{data.title.trim() || displayTitle}</dd></div>
            <div className="cf-summary-row"><dt>Group</dt><dd>{group?.name ?? data.newGroup ?? '-'}</dd></div>
            <div className="cf-summary-row"><dt>Questions</dt><dd>{nComplete}</dd></div>
            <div className="cf-summary-row"><dt>Difficulty</dt><dd className="cf-summary-cap">{data.difficulty}</dd></div>
            <div className="cf-summary-row"><dt>Language</dt><dd><span className="cf-summary-lang">{languageChip(data.language)}</span></dd></div>
          </dl>

          {!ready && (
            <p className="cf-reqs" role="status">To publish: a title (5+ chars), a group, and at least {MIN_QUESTIONS} complete questions (you have {nComplete}). <button type="button" className="cf-inline-link" onClick={() => setStep(2)}>Add questions</button></p>
          )}

          {publishError && <p className="cf-error" role="alert">{publishError}</p>}

          {publishing ? (
            <button type="button" className="cf-cta" disabled><span className="bt-spinner" /> Publishing...</button>
          ) : signedIn && needsUsername ? (
            <>
              <p className="cf-reassure">One quick thing - pick a username so fans know who made this quiz.</p>
              <label className="cf-label" htmlFor="cf-uname">Username</label>
              <div className="cf-uname-row">
                <span className="cf-uname-at" aria-hidden="true">@</span>
                <input id="cf-uname" className="auth-inp cf-uname-input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="yourname" maxLength={20} autoComplete="off" spellCheck={false} aria-describedby="cf-uname-status" />
              </div>
              <p id="cf-uname-status" className={`cf-uname-status is-${unameStatus}`} role="status">
                {unameStatus === 'checking' ? 'Checking...'
                  : unameStatus === 'available' ? 'Available'
                  : unameStatus === 'taken' ? 'Taken - try another'
                  : unameStatus === 'invalid' ? '3 to 20 chars: lowercase letters, numbers, underscores'
                  : 'Pick a handle (3 to 20 characters)'}
              </p>
              <button type="button" className="cf-cta" disabled={!ready || unameStatus !== 'available' || claiming} onClick={() => void claimAndPublish()}>
                {claiming ? <><span className="bt-spinner" /> Publishing...</> : <>Claim username &amp; publish &rarr;</>}
              </button>
            </>
          ) : signedIn ? (
            <>
              <p className="cf-reassure">You&apos;re signed in. Publishing links this quiz to your account.</p>
              <button type="button" className="cf-cta" disabled={!ready} onClick={() => void publish()}>Publish quiz &rarr;</button>
            </>
          ) : (
            <>
              <p className="cf-reassure">Your quiz is saved. Sign in once to publish it and keep it linked to you - takes 5 seconds.</p>
              <button type="button" className="auth-btn auth-google" disabled={!ready} onClick={() => void signInWith('google')}><span className="auth-icon">{GoogleIcon}</span>Continue with Google</button>
              <button type="button" className="auth-btn auth-discord" disabled={!ready} onClick={() => void signInWith('discord')}><span className="auth-icon">{DiscordIcon}</span>Continue with Discord</button>
              <div className="auth-divider"><span>or with email</span></div>
              {emailSent ? (
                <p className="cf-reassure">Magic link sent to <strong>{email}</strong>. Open it on this device to finish and publish.</p>
              ) : (
                <>
                  <input className="auth-inp" type="email" inputMode="email" placeholder="you@example.com" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button type="button" className="email-btn" disabled={!ready || !email.trim()} onClick={() => void signInEmail()}>Sign in with email</button>
                </>
              )}
            </>
          )}

          <button type="button" className="cf-ghost" onClick={() => setStep(2)}>&larr; Keep editing</button>
        </div>
      )}

      {/* ===================== SCREEN 4 - SHARE ===================== */}
      {step === 4 && published && (
        <div className="cf-body cf-celebrate">
          <div className="cf-burst" aria-hidden="true">
            {/* F3 - real celebrate mascot (placeholder logo retired). */}
            <Mascot variant="celebrate" animate="bob" size={108} alt="" />
          </div>
          <h1 className="cf-head cf-center">Your quiz is live!</h1>
          <p className="cf-sub cf-center">Quizzes that get shared get played. Send it to your fandom and see who can beat it.</p>

          {(() => {
            const nudge = creatorNudge(published.creator_stats);
            if (!nudge) return null;
            const pct = nudge.target > 0 ? Math.min(100, Math.round((nudge.current / nudge.target) * 100)) : 100;
            return (
              <div className="cf-nudge" role="status">
                <span className="cf-nudge-text">{nudge.text}</span>
                {!nudge.maxed && (
                  <span className="cf-nudge-bar" aria-hidden="true"><span className="cf-nudge-fill" style={{ width: `${pct}%` }} /></span>
                )}
              </div>
            );
          })()}

          <div className="cf-share-btns">
            <button type="button" className="cf-share-btn cf-reddit" onClick={() => setShareModal('reddit')}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm5.49 10.354a1.55 1.55 0 0 1 .01.175c0 2.677-3.117 4.847-6.962 4.847-3.845 0-6.962-2.17-6.962-4.847 0-.06.003-.12.01-.175a1.178 1.178 0 0 1-.315-.806 1.19 1.19 0 0 1 2.024-.843c.98-.629 2.315-1.032 3.797-1.078l.748-3.295a.24.24 0 0 1 .285-.18l2.321.487a.83.83 0 1 1-.083.475l-2.07-.435-.664 2.923c1.457.06 2.768.462 3.736 1.082a1.19 1.19 0 1 1 1.124 1.298zm-9.028 0a.595.595 0 1 0 1.19 0 .595.595 0 0 0-1.19 0zm5.283 1.658c-.493.493-1.55.668-1.757.668-.208 0-1.27-.178-1.758-.668a.196.196 0 0 0-.277.277c.62.62 1.799.84 2.035.84.237 0 1.41-.22 2.034-.84a.196.196 0 0 0-.277-.277z" /></svg>
              Reddit
            </button>
            <button type="button" className="cf-share-btn cf-discord" onClick={() => setShareModal('discord')}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.554 2.893A12.634 12.634 0 0 0 10.436 1.8a8.268 8.268 0 0 0-.404.817 11.828 11.828 0 0 0-3.502 0A8.923 8.923 0 0 0 6.149 1.8a12.67 12.67 0 0 0-3.12 1.095C.767 5.685.214 8.487.49 11.25A12.697 12.697 0 0 0 4.35 13.2a9.437 9.437 0 0 0 .834-1.35 8.202 8.202 0 0 1-1.313-.629c.11-.08.218-.163.322-.25a9.07 9.07 0 0 0 7.698 0c.105.09.213.173.323.25a8.23 8.23 0 0 1-1.316.63 9.394 9.394 0 0 0 .834 1.348 12.65 12.65 0 0 0 3.863-1.95c.334-3.212-.57-5.986-2.04-8.456ZM5.53 9.665c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.348.67 1.336 1.49 0 .82-.588 1.487-1.336 1.487Zm4.94 0c-.733 0-1.336-.667-1.336-1.487 0-.82.588-1.49 1.336-1.49.749 0 1.344.67 1.336 1.49-.003.82-.588 1.487-1.336 1.487Z" /></svg>
              Discord
            </button>
            <button type="button" className="cf-share-btn cf-x" onClick={() => setShareModal('twitter')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              X
            </button>
          </div>

          <button type="button" className="cf-copylink" onClick={() => { void copyShareLink(published.id, published.slug); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}>
            <span className="cf-copylink-url">{quizUrl.replace(/^https?:\/\//, '')}</span>
            <span className="cf-copylink-btn">{copied ? 'Copied!' : 'Copy link'}</span>
          </button>

          <a className="cf-ghost cf-center-btn" href={`/q/${published.slug}`} target="_blank" rel="noopener noreferrer">Open your quiz &rarr;</a>
          <button type="button" className="cf-ghost cf-center-btn" onClick={() => { setData(emptyState()); setPublished(null); setEmailSent(false); setEmail(''); setPublishError(null); setUsername(''); setUnameStatus('idle'); autoPubFired.current = false; setStep(1); }}>Create another quiz</button>

          {shareModal && (
            <ShareCardModal quizId={published.id} slug={published.slug} quizTitle={displayTitle} platform={shareModal} canEdit onClose={() => setShareModal(null)} />
          )}
        </div>
      )}
    </div>
  );
}
