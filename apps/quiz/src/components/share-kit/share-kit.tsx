'use client';

import { useEffect, useMemo, useState } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { Sheet } from '@/components/ux-v1/sheet';
import { STORY_KIT_GRADIENT, downloadFile, storyCardFile } from '@/components/ux-v1/story-image';
import { StoryPreview } from '@/components/ux-v1/story-preview';
import { useUxToast } from '@/components/ux-v1/toast';

import { bareUrl, kitCaptions, kitKicker } from './captions';

import type { KitResponse } from '@/app/api/creators/kit/route';
import type { StoryFormat } from '@/components/ux-v1/story-image';
import type { KitQuiz } from './captions';

/**
 * The QR slot. This run's QR encoder is G4's (lib/live/qr.ts); the kit does not
 * import it, the caller hands it in: `render` draws the code inside the story
 * preview, `dataUrl` gives the same code as a picture for the saved PNG. Without
 * it the kit has no QR tile (and says nothing about one).
 */
export interface KitQr {
  render: (url: string) => React.ReactNode;
  dataUrl: (url: string) => string;
}

export interface ShareKitProps {
  open: boolean;
  onClose: () => void;
  /** The published quiz. */
  quizId: string;
  slug: string;
  /** What the creator typed, shown until the server's copy of the quiz arrives. */
  fallbackTitle: string;
  qr?: KitQr | undefined;
}

const POLL_MS = 20_000;

function isKit(v: unknown): v is KitResponse {
  const k = v as Partial<KitResponse> | null;
  return Boolean(k && typeof k === 'object' && k.quiz && typeof k.quiz.title === 'string' && typeof k.quiz.slug === 'string');
}

async function readKit(quizId: string): Promise<KitResponse | null> {
  try {
    const res = await fetch(`/api/creators/kit?quiz=${encodeURIComponent(quizId)}`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    return isKit(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** The creator's tracked link (the EXISTING POST /api/share/generate, platform
 *  "link", the call lib/share copyShareLink makes), or null when it cannot be made. */
async function trackedLink(quizId: string): Promise<string | null> {
  try {
    const res = await fetch('/api/share/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, platform: 'link' }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { shareCode?: unknown };
    return typeof data.shareCode === 'string' && data.shareCode ? `${window.location.origin}/s/${data.shareCode}` : null;
  } catch {
    return null;
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share kit (SYSTEM.md 5.4, prototype #kit): what a creator needs right after
 * publishing. The story image (story and square PNG), their tracked link, two
 * captions with the fandom's name, a challenge door, and the plays that came
 * through their link.
 *
 * Real data only: the title, group, fandom and question count come from the
 * published quiz (GET /api/creators/kit); "plays from your link" shows only when
 * the server has that number (null = the line is not rendered).
 */
export function ShareKit({ open, onClose, quizId, slug, fallbackTitle, qr }: ShareKitProps): React.ReactElement | null {
  const toast = useUxToast();
  const [kit, setKit] = useState<KitResponse | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState<StoryFormat | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let on = true;
    void readKit(quizId).then((k) => { if (on && k) setKit(k); });
    void trackedLink(quizId).then((l) => { if (on && l) setLink(l); });
    // "live": the count is read again while the kit is open.
    const t = window.setInterval(() => { void readKit(quizId).then((k) => { if (on && k) setKit(k); }); }, POLL_MS);
    return () => { on = false; window.clearInterval(t); };
  }, [open, quizId]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kpopquiz.org';
  const url = link ?? `${origin}/q/${slug}`;
  const quiz: KitQuiz = useMemo(() => ({
    title: kit?.quiz.title ?? fallbackTitle,
    slug,
    questions: kit?.quiz.questions ?? 0,
    group: kit?.group?.name ?? null,
    fandom: kit?.group?.fandom ?? null,
  }), [kit, fallbackTitle, slug]);
  const captions = useMemo(() => kitCaptions(quiz, url), [quiz, url]);
  const kicker = kitKicker(quiz);
  const plays = kit?.linkPlays ?? null;

  const copy = async (text: string, done: string): Promise<void> => {
    toast((await copyText(text)) ? done : 'Could not copy. Select the text and copy it instead.');
  };

  const save = async (format: StoryFormat): Promise<void> => {
    if (busy) return;
    setBusy(format);
    try {
      const file = await storyCardFile({
        image: null,
        line1: quiz.title,
        format,
        kicker,
        tag: 'New quiz',
        cta: 'Play at kpopquiz.org',
        gradient: STORY_KIT_GRADIENT,
        qr: qr ? qr.dataUrl(url) : undefined,
      });
      if (!file) { toast('Could not make the image. Try again.'); return; }
      downloadFile(file);
      toast(format === 'square' ? 'Square image saved (1080 x 1080)' : 'Story image saved (1080 x 1920)');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Share kit" width={880} className="g8-kit">
      <div className="g8-kitg" data-testid="share-kit">
        <div className="g8-kit-story">
          <StoryPreview title={quiz.title} kicker={kicker} tag="New quiz" cta="Play at kpopquiz.org" qr={qr ? qr.render(url) : undefined} titleAs="p" />
          <div className="g8-kit-fmt">
            <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => { void save('story'); }} disabled={busy !== null}><Icon name="img" />Story</button>
            <button type="button" className="ux-btn ux-btn-ghost ux-btn-sm" onClick={() => { void save('square'); }} disabled={busy !== null}><Icon name="img" />Square</button>
          </div>
        </div>
        <div className="g8-kit-main">
          <section className="g8-kitsec" aria-labelledby="g8-kit-link">
            <h3 id="g8-kit-link">Your link</h3>
            <div className="ux-urlbox g8-kit-url">
              <span data-testid="kit-url">{bareUrl(url)}</span>
              <button type="button" className="ux-btn ux-btn-quiet ux-btn-sm" onClick={() => { void copy(url, 'Link copied'); }}>Copy</button>
            </div>
          </section>
          <section className="g8-kitsec" aria-labelledby="g8-kit-post">
            <h3 id="g8-kit-post">Ready to post</h3>
            <div className="g8-capt">
              {captions.map((c) => (
                <div key={c.id} className="g8-cap">
                  <p><b>{c.label}</b>{c.text}</p>
                  <button type="button" className="ux-btn ux-btn-quiet ux-btn-sm" onClick={() => { void copy(c.text, 'Caption copied'); }} aria-label={`Copy the ${c.label} caption`}>Copy</button>
                </div>
              ))}
            </div>
          </section>
          <section className="g8-kitsec" aria-labelledby="g8-kit-ch">
            <h3 id="g8-kit-ch">Challenge your mutuals</h3>
            <div className="g8-kit-ch">
              <a className="ux-btn ux-btn-ghost ux-btn-sm" href={`/community?compose=challenge&quiz=${encodeURIComponent(slug)}`}><Icon name="target" />Post a challenge</a>
              <span className="ux-muted">It goes to the community feed with your quiz.</span>
            </div>
          </section>
          <section className="g8-kitsec" aria-label="Plays and alerts">
            {plays !== null ? (
              <p className="g8-livecount" data-testid="kit-plays" aria-live="polite">
                <span className="g8-livedot" aria-hidden="true" />
                <span><b className="ux-num">{plays.toLocaleString('en-US')}</b> {plays === 1 ? 'play' : 'plays'} from your link</span>
                <span className="ux-muted">· live</span>
              </p>
            ) : null}
            <p className="ux-muted g8-kit-note">You get a notification at 10, 100 and 1,000 plays. First quiz on a group: your name stays on its page.</p>
          </section>
        </div>
      </div>
    </Sheet>
  );
}
