// Games-hub redesign: a tiny animated preview of each game's real round. Pure
// markup + CSS (see .gp-* in globals.css); no client JS. It animates on card
// hover (.gm-card:hover .gp-*) and, in the rotating spotlight, when its slide is
// active (the spotlight adds .is-live to the active .gp). Decorative, so the
// whole thing is aria-hidden - the card's real name/desc carry the meaning.

// (games-hub redesign) six per-game previews, shared by the card grid + spotlight.
export type PreviewKind = 'member' | 'blind' | 'tot' | 'name' | 'sort' | 'match';

/** Two real idol photos for the This-or-that (tot) preview; falls back to
 * gradient tiles when none are supplied. */
export interface VersusFace { image: string; name?: string }

const PlayTri = (): React.ReactElement => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);

function Body({ kind, versus }: { kind: PreviewKind; versus?: VersusFace[] | undefined }): React.ReactElement {
  switch (kind) {
    case 'blind':
      // equalizer plays a 10s clip, then the correct text answer turns green
      return (
        <>
          {Array.from({ length: 14 }).map((_, i) => <i key={i} />)}
          <span className="gp-play"><PlayTri /> 0:10</span>
          <span className="gp-ans"><span>Butter</span><span className="ok">Dynamite &#10003;</span></span>
        </>
      );
    case 'tot': {
      // two real idol photos + VS, crowd % bar and an Elo delta (gradient
      // fallback when no photos are available)
      const a = versus?.[0];
      const b = versus?.[1];
      return (
        <span className="gp-vs">
          <span className="gp-vs-row">
            {a?.image
              ? <img className="gp-ava" src={a.image} alt="" />
              : <span className="gp-ava" style={{ background: 'linear-gradient(135deg,#f0abfc,#c084fc)' }} />}
            <span className="gp-vs-mid">VS</span>
            {b?.image
              ? <img className="gp-ava" src={b.image} alt="" />
              : <span className="gp-ava" style={{ background: 'linear-gradient(135deg,#fda4af,#fb7185)' }} />}
          </span>
          <span className="gp-vs-pct"><span>64% <b>+12</b></span><span>36%</span></span>
          <span className="gp-bar"><i /></span>
        </span>
      );
    }
    case 'member':
      // progress 3/10, a question, tappable answers
      return (
        <span className="gp-quiz">
          <span className="gp-prog"><span>3/10</span><i /></span>
          <span className="gp-q">Your ideal Friday?</span>
          <span className="gp-opts"><span className="gpv-opt pick">Cozy night in</span><span className="gpv-opt">Out till 4am</span></span>
        </span>
      );
    case 'name':
      // HUD (count / timer) + one input + slots that fill as you type
      return (
        <span className="gp-roster">
          <span className="gp-hud"><span>3/24</span><span>0:47</span></span>
          <span className="gp-input">type a member<span className="gp-car" /></span>
          <span className="gp-slots">{Array.from({ length: 5 }).map((_, i) => <span key={i} className="gp-slot" />)}</span>
        </span>
      );
    case 'sort':
      // one card, two bucket buttons (tap / swipe left-right)
      return (
        <>
          <span className="gp-drop">TWICE</span>
          <span className="gp-sort"><span className="gp-bin">&larr; Girl group</span><span className="gp-bin">Boy group &rarr;</span></span>
        </>
      );
    case 'match':
      // two-column board; pair a tile from each side, matches lock green
      return (
        <span className="gp-board">
          <span className="gp-col"><span className="gp-tile a">Dynamite</span><span className="gp-tile">FANCY</span><span className="gp-tile">DDU-DU</span></span>
          <span className="gp-col"><span className="gp-tile">TWICE</span><span className="gp-tile b">BTS</span><span className="gp-tile">BLACKPINK</span></span>
        </span>
      );
  }
}

export function GamePreview({ kind, live = false, versus }: {
  kind: PreviewKind;
  /** Force the animation on (the spotlight's active slide). */
  live?: boolean;
  /** Real idol photos for the tot (This-or-that) preview. */
  versus?: VersusFace[] | undefined;
}): React.ReactElement {
  const cls = `gp${kind === 'blind' ? ' gp-wave' : ''}${live ? ' is-live' : ''}`;
  return (
    <span className={cls} aria-hidden="true">
      <Body kind={kind} versus={versus} />
    </span>
  );
}
