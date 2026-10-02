'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { Distribution, ResultCard } from '@/components/ux-v1/result-card';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { ShareSheet } from '@/components/ux-v1/share-sheet';
import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { STORY_KIT_GRADIENT, downloadFile, storyCardFile } from '@/components/ux-v1/story-image';
import { useAnnounce, useUxToast } from '@/components/ux-v1/toast';
import { refreshUxMe, useUxMe } from '@/components/ux-v1/use-ux-me';
import { resolveResult } from '@/lib/personality/engine';
import { shareOf } from '@/lib/personality/view';
import { takePendingAction } from '@/lib/ux-v1/a0/pending-action';

import type { StoryFormat } from '@/components/ux-v1/story-image';
import type { QuizView, ResultView } from '@/lib/personality/view';

/**
 * The personality quiz (V12 G5, SYSTEM.md 5.2, prototype views `wma` and `kpdh`):
 * intro, picture-free questions with big answer cards and no timer, then the
 * result card. One component for Which member are you and for the KPop Demon
 * Hunters bridge quiz; the page hands it a QuizView built from real data.
 *
 * The result is computed here from the answers (lib/personality/engine.ts, pure).
 * One call leaves the page: POST /api/personality/result with the answer sheet,
 * at most once per device, quiz and UTC day, never awaited. The share of fans and
 * the distribution come with the page (real counts, or absent).
 */

const BIAS_ACTION = 'g5-bias';
const PICK_DELAY_MS = 160;
/** Sheets already sent when storage is blocked: per page load only. */
const sentThisLoad = new Set<string>();

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True the first time today on this device for this quiz (and marks it). */
function firstToday(key: string): boolean {
  const k = `g5:saved:${key}:${utcDay()}`;
  try {
    if (window.localStorage.getItem(k)) return false;
    window.localStorage.setItem(k, '1');
    return true;
  } catch {
    if (sentThisLoad.has(k)) return false;
    sentThisLoad.add(k);
    return true;
  }
}

export function PersonalityQuiz({ view, also }: { view: QuizView; also?: React.ReactNode }): React.ReactElement {
  const total = view.questions.length;
  /** -1 intro, 0..total-1 a question, total the result. */
  const [step, setStep] = useState(-1);
  const [picks, setPicks] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [biasSet, setBiasSet] = useState<string | null>(null);
  const [biasBusy, setBiasBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const resultBox = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useUxToast();
  const announce = useAnnounce();
  const signIn = useSignIn();
  const me = useUxMe();
  const signedIn = Boolean(me?.profile);

  const titleText = `${view.title.before}${view.title.em}${view.title.after}`;
  const resultId = useMemo(() => (step >= total ? resolveResult(view.engine, picks) : null), [step, total, view.engine, picks]);
  const result: ResultView | null = resultId ? view.results.find((r) => r.id === resultId) ?? null : null;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Keyboard and screen reader: after a step change the new heading takes focus.
  useEffect(() => {
    if (!moved.current) return;
    (resultBox.current ?? heading.current)?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [step]);

  // The one write: the answer sheet, once per device, quiz and day. Never awaited.
  useEffect(() => {
    if (!result) return;
    announce(`Result: ${result.name}`);
    if (!firstToday(`${view.quiz}:${view.groupSlug ?? 'all'}`)) return;
    fetch('/api/personality/result', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz: view.quiz, ...(view.groupSlug ? { group: view.groupSlug } : {}), picks }),
    }).catch(() => {});
    // `picks` is complete and frozen once there is a result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);

  const sendBias = useCallback(async (name: string): Promise<void> => {
    setBiasBusy(true);
    try {
      const r = await fetch('/api/auth/update-profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bias: name }),
      });
      if (!r.ok) throw new Error('refused');
      setBiasSet(name);
      toast(`Bias tag set to ${name}`);
      refreshUxMe();
    } catch {
      toast('Could not set your bias tag. Try again.');
    } finally {
      setBiasBusy(false);
    }
  }, [toast]);

  // Back from the sign-in sheet: finish the bias the fan asked for (16.6).
  useEffect(() => {
    if (!view.biasOffer || !signedIn) return;
    const pending = takePendingAction(BIAS_ACTION);
    const name = (pending?.payload as { bias?: unknown } | undefined)?.bias;
    if (typeof name === 'string' && view.results.some((r) => r.name === name)) void sendBias(name);
  }, [signedIn, view.biasOffer, view.results, sendBias]);

  const start = (): void => { moved.current = true; setPicks([]); setPicked(null); setStep(0); };
  const retake = (): void => { moved.current = true; setShareOpen(false); setBiasSet(null); setPicks([]); setPicked(null); setStep(-1); };
  const back = (): void => {
    if (step <= 0 || picked !== null) return;
    moved.current = true;
    setPicks((p) => p.slice(0, -1));
    setStep(step - 1);
  };
  const pick = (j: number): void => {
    if (picked !== null) return;
    moved.current = true;
    setPicked(j);
    timer.current = setTimeout(() => {
      setPicks((p) => [...p.slice(0, step), j]);
      setPicked(null);
      setStep(step + 1);
    }, PICK_DELAY_MS);
  };

  const askBias = (name: string): void => {
    if (biasBusy) return;
    if (!signedIn) {
      signIn({ title: `Sign in to set ${name} as your bias tag`, sub: 'It shows next to your name in Community. No password needed.', action: { id: BIAS_ACTION, payload: { bias: name } } });
      return;
    }
    void sendBias(name);
  };

  const card = (format: StoryFormat): Promise<File | null> => {
    if (!result) return Promise.resolve(null);
    return storyCardFile({
      image: null,
      line1: result.name,
      line2: result.role,
      kicker: view.shareKicker,
      tag: 'My result',
      cta: 'Play at kpopquiz.org',
      gradient: STORY_KIT_GRADIENT,
      format,
    }).catch(() => null);
  };
  const saveImage = async (format: StoryFormat): Promise<void> => {
    const file = await card(format);
    if (!file) { toast('Could not make the image'); return; }
    downloadFile(file);
    toast(format === 'square' ? 'Square image saved (1080 x 1080)' : 'Story image saved (1080 x 1920)');
  };

  // ---------- intro ----------
  if (step < 0) {
    return (
      <>
        <div className="ux-pers-intro" data-testid="pers-intro" data-quiz={view.quiz}>
          <span className="ux-kicker"><Icon name={view.kickerIcon} />{view.kicker}</span>
          <h1>{view.title.before}<em>{view.title.em}</em>{view.title.after}</h1>
          <p className="ux-pers-lead">{view.lead}</p>
          <div className="ux-pers-actions">
            <UxButton size="lg" icon="play" onClick={start}>{view.cta}</UxButton>
          </div>
          <ul className="ux-pers-meta">{view.meta.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
        {/* A server-rendered node: wrapped so it is a single child here, not an unkeyed list item. */}
        {also ? <div className="ux-pers-slot">{also}</div> : null}
      </>
    );
  }

  // ---------- a question ----------
  if (step < total) {
    const q = view.questions[step];
    if (!q) return <h1 className="ux-sr">{titleText}</h1>;
    return (
      <>
        <h1 className="ux-sr">{titleText}</h1>
        <div className="ux-pers-q" data-testid="pers-question" data-quiz={view.quiz} data-step={step + 1}>
          <div className="ux-pers-top">
            <span>Question {step + 1} of {total}</span>
            {step > 0 ? <button type="button" className="ux-lnk" onClick={back}>Back</button> : <span />}
          </div>
          <div className="ux-pers-bar" aria-hidden="true"><i style={{ width: `${Math.round((step / total) * 100)}%` }} /></div>
          <h2 ref={heading} tabIndex={-1} className="ux-pers-qt">{q.text}</h2>
          <div className="ux-pers-opts" role="group" aria-label="Answers">
            {q.options.map((o, j) => (
              <button key={o.text} type="button" className={picked === j ? 'ux-pers-opt is-sel' : 'ux-pers-opt'} aria-pressed={picked === j} onClick={() => pick(j)}>
                <span className="ux-pers-pi"><Icon name={o.icon} /></span>
                <span>{o.text}</span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ---------- the result ----------
  if (!result) {
    return (
      <>
        <h1 className="ux-sr">{titleText}</h1>
        <div className="ux-pers-intro" data-testid="pers-noresult">
          <p className="ux-pers-lead">That did not work. Try again.</p>
          <div className="ux-pers-actions"><UxButton icon="redo" onClick={retake}>Retake</UxButton></div>
        </div>
      </>
    );
  }

  const share = shareOf(view.distribution, result.id);
  const shareText = view.quiz === 'wma'
    ? `I got ${result.name}. ${view.shareKicker}?`
    : `My real K-pop girl group is ${result.name}. Find yours.`;
  const songs = result.songs ?? [];

  return (
    <>
      <h1 className="ux-sr">{titleText}</h1>
      <div ref={resultBox} tabIndex={-1} className="ux-pers-res" data-testid="pers-result" data-quiz={view.quiz} data-result={result.id}>
        <ResultCard
          eyebrow={view.eyebrow}
          name={result.name}
          role={result.role}
          description={result.description}
          traits={result.traits}
          photo={result.photo ? { src: result.photo, alt: result.name } : undefined}
          same={share !== null ? <><b>{share}%</b> of {view.who} got {result.name}</> : undefined}
          actions={(
            <>
              <UxButton icon="share" onClick={() => setShareOpen(true)}>Share my result</UxButton>
              <UxButton variant="ghost" icon="redo" onClick={retake}>Retake</UxButton>
            </>
          )}
        />

        <div className="ux-pers-imgs">
          <span>Save as an image</span>
          <UxButton variant="ghost" size="sm" icon="img" onClick={() => { void saveImage('story'); }}>Story</UxButton>
          <UxButton variant="ghost" size="sm" icon="img" onClick={() => { void saveImage('square'); }}>Square</UxButton>
        </div>

        {view.biasOffer ? (
          <div className="ux-pers-bias" data-testid="pers-bias">
            <Icon name="heart" />
            {biasSet === result.name
              ? <span className="ux-pers-grow"><b>{result.name}</b> is your bias tag. It shows next to your name in Community.</span>
              : <span className="ux-pers-grow">Make <b>{result.name}</b> your bias tag? It shows next to your name in Community.</span>}
            {biasSet === result.name ? null : (
              <UxButton variant="ghost" size="sm" disabled={biasBusy} onClick={() => askBias(result.name)}>Set bias</UxButton>
            )}
          </div>
        ) : null}

        {songs.length > 0 ? (
          <section className="ux-pers-sec" aria-labelledby="pers-songs-h">
            <SectionHeader id="pers-songs-h" title="Start with these three" icon="music" {...(result.groupHref ? { action: { href: result.groupHref, label: `${result.name} page` } } : {})} />
            <ul className="ux-rows ux-pers-songs">
              {songs.map((s) => (
                <li key={s.title} className="ux-row">
                  <span className="ux-thumb ux-pers-thumb" aria-hidden="true"><Icon name="music" /></span>
                  <span className="ux-row-grow">
                    <span className="ux-rt">{s.title}</span>
                    <span className="ux-rs">{result.name} · {s.year}</span>
                  </span>
                </li>
              ))}
            </ul>
            {result.blindtestHref || result.groupHref ? (
              <div className="ux-pers-acts">
                {result.blindtestHref ? <UxButton href={result.blindtestHref} icon="music">Play the {result.name} blindtest</UxButton> : null}
                {result.groupHref ? <UxButton href={result.groupHref} variant="ghost">Open the {result.name} page</UxButton> : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {view.distribution ? (
          <section className="ux-pers-sec" aria-labelledby="pers-dist-h" data-testid="pers-dist">
            <SectionHeader id="pers-dist-h" title="How everyone came out" icon="grid" sub={`${view.distribution.total.toLocaleString('en-US')} results`} />
            <Distribution items={view.distribution.rows} meId={result.id} label="How everyone came out" />
          </section>
        ) : null}
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share your result"
        preview={{ image: result.photo, line1: `${view.eyebrow} ${result.name}`, line2: view.shareKicker }}
        url={view.shareUrl}
        text={shareText}
        onStoryImage={() => saveImage('story')}
        storyFile={() => card('story')}
      />
    </>
  );
}
