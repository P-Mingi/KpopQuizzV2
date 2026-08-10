// PART C - the per-type body sections (from prototypes/verse-child-templates.html). Pure
// presentational; the route fetches DB-derived data and passes it in. Nothing is fabricated:
// a track links only when its page exists, an era shows only its real albums, the award shell
// ships empty (awards are stubs) with an honest empty state, never invented rows.
import Link from 'next/link';

export interface Track { n: number; title: string; href: string | null }
export function Tracklist({ tracks }: { tracks: Track[] }): React.ReactElement | null {
  if (!tracks.length) return null;
  return (
    <section className="vtpl">
      <div className="vtpl-head"><h2>Tracklist</h2><span className="vtpl-more">{tracks.length} track{tracks.length === 1 ? '' : 's'}</span></div>
      <ol className="vtpl-tracks">
        {tracks.map((t) => (
          <li key={t.n} className="vtpl-trk">
            <span className="n">{t.n}</span>
            {t.href ? <Link className="t" href={t.href}>{t.title}</Link> : <span className="t">{t.title}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

export interface EraAlbum { title: string; meta: string; href: string; initials: string }
export function EraReleases({ albums }: { albums: EraAlbum[] }): React.ReactElement | null {
  if (!albums.length) return null;
  return (
    <section className="vtpl">
      <div className="vtpl-head"><h2>Releases in this chapter</h2><span className="vtpl-more">{albums.length}</span></div>
      <div className="vtpl-covers">
        {albums.map((a) => (
          <Link key={a.href} className="vtpl-cover" href={a.href}>
            <span className="art" aria-hidden="true">{a.initials}</span>
            <b>{a.title}</b>
            <span className="k">{a.meta}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export interface EraLink { label: string; href: string }
export function EraNav({ prev, next }: { prev: EraLink | null; next: EraLink | null }): React.ReactElement | null {
  if (!prev && !next) return null;
  return (
    <nav className="vtpl-eranav" aria-label="Chapter navigation">
      {prev ? <Link className="prev" href={prev.href}><span className="dir">&#8592; Previous chapter</span><b>{prev.label}</b></Link> : <span />}
      {next ? <Link className="next" href={next.href}><span className="dir">Next chapter &#8594;</span><b>{next.label}</b></Link> : <span />}
    </nav>
  );
}

// The award data-template SHELL (awards are stubs; ship the skeleton, invent no rows).
export function AwardShell(): React.ReactElement {
  return (
    <section className="vtpl">
      <div className="vtpl-head"><h2>Awards</h2></div>
      <div className="vtpl-awtable">
        <div className="vtpl-awhead"><span>Year</span><span>Award</span><span>Category</span><span>Result</span></div>
        <p className="vtpl-awempty">No award rows are catalogued yet. When they are, they list here as a sortable year / category / result table, one row per award. This page stays out of search until it has real data.</p>
      </div>
    </section>
  );
}

// small eyebrows above the title (topSlot).
export function TypeEyebrow({ text, chapter }: { text: string; chapter?: boolean }): React.ReactElement {
  return <p className={`vtpl-eyebrow${chapter ? ' chapter' : ''}`}>{text}</p>;
}
