// V-FOUNDATION F4.2 - the home v2 PAGE HEAD (the Notion-style opening from
// prototypes/bts-home-v2.html): a soft cover band, an overlapping page icon, an
// eyebrow, the page's ONE H1 with a hangul subtitle when a source exists, a lede,
// and two pill actions. Everything is sourced from real group data (covenant):
// nothing here is invented. Rendered ONLY on the portal home; the shared space
// hero + tabs are suppressed for the home (globals.css :has(.vh2-home)).
import Link from 'next/link';

import type { Space } from '@/lib/verse/space';

export function VerseHomeHead({ space }: { space: Space }): React.ReactElement {
  const g = space.group;
  const year = g.inception_date?.slice(0, 4) ?? (space.config.est_year != null ? String(space.config.est_year) : null);
  // "3rd Gen" -> "3rd generation" reads better in the eyebrow; keep the DB value as source.
  const gen = g.generation ? g.generation.replace(/\bGen\.?$/i, 'generation') : null;
  const eyebrow = [`Home of ${g.fandom_name}`, gen, year ? `since ${year}` : null].filter(Boolean).join(' · ');
  const lede = space.config.welcome_line?.trim() || null;
  const initial = g.name.trim().charAt(0).toUpperCase() || '?';
  const hasQuiz = (g.quiz_count ?? 0) > 0;

  return (
    <div className="vh2-home">
      {/* Cover: the moderated-rail image when one exists; the owner-approved default
          is a soft gradient (CSS). The tag names where a real cover comes from. */}
      <div className="vh2-cover" role="img" aria-label={`${g.name} cover`}>
        <span className="vh2-covertag">Cover · via the moderated image rail</span>
      </div>

      <header className="vh2-head">
        <div className="vh2-icon" aria-hidden="true">{initial}</div>
        {eyebrow ? <p className="vh2-eyebrow">{eyebrow}</p> : null}
        {/* The page's ONE h1. Group hangul is not stored yet (flagged): the subtitle
            renders only when a real source exists, never invented. */}
        <h1 className="vh2-h1">{g.name}</h1>
        {lede ? <p className="vh2-lede">{lede}</p> : null}
        <div className="vh2-actions">
          <Link className="vh2-btn" href="#vh2-body">Explore the space</Link>
          {hasQuiz ? <Link className="vh2-btn ghost" href="/quizzes">Play a {g.name} quiz</Link> : null}
        </div>
      </header>
    </div>
  );
}
