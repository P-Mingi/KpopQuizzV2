import Link from 'next/link';

import type { PersonalityGroup, PersonalityGroupTile } from '@/lib/personality/data';

// Workstream P entry points: the permanent games-hub section (group tiles with
// member-face strips) and the single-group card used on group pages.

function faceStrip(faces: string[], accent: string): React.ReactElement {
  return (
    <span className="pqh-faces" aria-hidden="true">
      {faces.slice(0, 5).map((f, i) => (
        <span key={i} className="pqh-face" style={{ borderColor: accent }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={encodeURI(f)} alt="" loading="lazy" />
        </span>
      ))}
    </span>
  );
}

export function PersonalityHubSection({ tiles }: { tiles: PersonalityGroupTile[] }): React.ReactElement | null {
  if (tiles.length === 0) return null;
  return (
    <section className="games-section">
      <div className="games-sec-head">
        <span className="games-sec-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          Which member are you?
        </span>
      </div>
      <div className="pqh-grid">
        {tiles.map((t) => (
          <Link key={t.slug} href={`/which-${t.slug}-member-are-you`} className="pqh-tile" style={{ ['--pq-accent' as string]: t.display_color }}>
            {faceStrip(t.faces, t.display_color)}
            <span className="pqh-tile-name">{t.name}</span>
            <span className="pqh-tile-sub">10 questions, 1 result</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PersonalityGroupCard({ group, faces }: { group: PersonalityGroup; faces: string[] }): React.ReactElement {
  return (
    <Link href={`/which-${group.slug}-member-are-you`} className="pqh-card" style={{ ['--pq-accent' as string]: group.display_color }}>
      {faceStrip(faces, group.display_color)}
      <span className="pqh-card-body">
        <span className="pqh-card-title">Which {group.name} member are you?</span>
        <span className="pqh-card-sub">Take the personality quiz, 10 questions</span>
      </span>
      <span className="pqh-card-arrow" aria-hidden="true">&rarr;</span>
    </Link>
  );
}
