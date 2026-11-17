// P5 (CR-025), links 2 and 13: the row of the daily game in "Keep playing", under "Next quiz". Drawn by the results screen only when the quiz page gave it (run.bridge, lib/passerelles/quiz-end.ts).
// A plain <a> with an absolute address: the hub is another app (on OtakuQuiz another base path), so next/link would be wrong. It carries its own inline rules (tokens only): no sheet changes.
import { Icon } from '@/components/ux-v1/icon';

import type { P4RunQuiz } from './run-context';

/** The title keeps the ink of the other rows: a link row takes the accent of the site otherwise (orange on OtakuQuiz). */
const INK: React.CSSProperties = { color: 'var(--ux-ink)' };

const PILL: React.CSSProperties = {
  marginLeft: 8, padding: '1px 8px', borderRadius: 999, background: 'var(--ux-pink-soft)', color: 'var(--ux-pink-soft-ink)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'middle',
};

/** Bunnyverse bridges: the row to KpopCards, drawn only when the quiz page gave `cardsBridge` (NET_CARDS_BRIDGES on). A plain link: no read, no report, no Cards code. */
export function QuizEndCards({ href }: { href: string }): React.ReactElement {
  return (
    <a className="ux-row" href={href} rel="nofollow" data-testid="cards-end-row">
      <span className="ux-thumb is-glyph"><Icon name="grid" /></span>
      <span className="ux-row-grow">
        <span className="ux-rt" style={INK}>KpopCards</span>
        <span className="ux-rs">Free K-pop photocards on Bunnyverse. Open a pack.</span>
      </span>
      <span className="ux-btn ux-btn-ghost ux-btn-sm" aria-hidden="true">Open</span>
    </a>
  );
}

export function QuizEndBridge({ bridge }: { bridge: NonNullable<P4RunQuiz['bridge']> }): React.ReactElement {
  if (bridge.kind === 'kpopdle') {
    return (
      <a className="ux-row" href={bridge.href} data-testid="p5-bridge-kpopdle">
        <span className="ux-thumb is-glyph"><Icon name="grid" /></span>
        <span className="ux-row-grow">
          <span className="ux-rt" style={INK}>Kpopdle<span style={PILL}>bunnyverse.org</span></span>
          <span className="ux-rs">Guess today&apos;s K-pop idol · free daily game</span>
        </span>
        <span className="ux-btn ux-btn-ghost ux-btn-sm" aria-hidden="true">Play</span>
      </a>
    );
  }
  return (
    <a className="ux-row" href={bridge.href} data-testid="p5-bridge-otakudle">
      <span className="ux-thumb is-glyph"><Icon name="star" /></span>
      <span className="ux-row-grow">
        <span className="ux-rt" style={INK}>Daily challenge: the mystery character</span>
        <span className="ux-rs">All series, spoiler-free.</span>
      </span>
      <span className="ux-btn ux-btn-ghost ux-btn-sm" aria-hidden="true">Try</span>
    </a>
  );
}
