// V3 home - the editorial CENTER column (from prototypes/bts-home-v2.html): Overview (with the
// anti-overflow fold), Members, Discography, The story so far, Community & Play. Pure PRESENTATION
// over the existing reads (space.idols / space.albums / getEras / getQuizzesByGroup) - no new
// data, no fabrication. Entity links resolve to the real tree pages by (entity_kind, entity_id).
import Link from 'next/link';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { getEras } from '@/lib/verse/eras';
import { getQuizzesByGroup } from '@/lib/db/queries/quizzes';
import { getStoredGroupTrivia } from '@/lib/trivia/stored-facts';
import { safeFetch } from '@/lib/error-handling';
import { Fold } from './fold';

import type { Space } from '@/lib/verse/space';

const yearOf = (iso: string | null): string | null => iso?.match(/^(\d{4})/)?.[1] ?? null;
const RELEASE_TYPE: Record<string, string> = { ep: 'EP', album: 'Album', single: 'Single', compilation: 'Compilation', mixtape: 'Mixtape' };
const initials = (name: string): string => name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export async function VerseHomeCenter({ space }: { space: Space }): Promise<React.ReactElement> {
  const g = space.group;
  const slug = g.slug;
  const db = createServiceRoleClient();

  // entity_id -> tree page slug, for real crawlable links (by binding, not slug-guessing).
  const { data: entPages } = await db.from('pages')
    .select('slug, entity_kind, entity_id').eq('space_id', g.id).eq('status', 'published')
    .in('entity_kind', ['idol', 'album', 'era']);
  const pageSlug = new Map<string, string>();
  for (const p of ((entPages ?? []) as { slug: string; entity_kind: string; entity_id: number }[])) pageSlug.set(`${p.entity_kind}:${p.entity_id}`, p.slug);

  const [eras, quizzes, storedFacts] = await Promise.all([
    safeFetch(getEras(g.id), [], 'home-center-eras'),
    safeFetch(getQuizzesByGroup(g.id, 'popular', 0, 3), [], 'home-center-quizzes'),
    safeFetch(getStoredGroupTrivia(g.id), [], 'home-center-trivia'),
  ]);

  const idols = [...space.idols].sort((a, b) => a.ord - b.ord);
  const albums = [...space.albums].sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''));

  // Overview: the authored portal prose if it exists, else a DB-derived lede (honest, no fabrication).
  const { data: portal } = await db.from('pages').select('blocks').eq('space_id', g.id).eq('slug', 'home').maybeSingle();
  const portalParas = (((portal?.blocks as { blocks?: { type: string; content?: { text?: string }[] }[] } | null)?.blocks ?? [])
    .filter((b) => b.type === 'paragraph').map((b) => (b.content ?? []).map((r) => r.text ?? '').join('')).filter((t) => t.trim().length > 0));
  const derivedIntro = derive(g, space.counts, eras.length, storedFacts.length);
  const overviewParas = portalParas.length ? portalParas : derivedIntro;

  return (
    <div className="vh2-center">
      {/* OVERVIEW - with the anti-overflow fold (full text stays in the DOM). */}
      <section className="vh2-sec" id="sec-overview" data-toc="Overview" style={{ paddingTop: 4 }}>
        <div className="vh2-sechead"><h2>Overview</h2></div>
        <Fold budgetPx={220}>
          <div className="vh2-prose">{overviewParas.map((t, i) => <p key={i}>{t}</p>)}</div>
        </Fold>
      </section>

      {/* MEMBERS */}
      {idols.length ? (
        <section className="vh2-sec" id="sec-members" data-toc="Members">
          <div className="vh2-sechead"><h2>Members</h2><Link className="vh2-more" href={`/verse/${slug}/members`}>All {idols.length} &#8594;</Link></div>
          <div className="vh2-members">
            {idols.map((i) => {
              const ps = pageSlug.get(`idol:${i.id}`);
              const inner = (<>
                {i.photo_url ? <img className="ph" src={i.photo_url} alt="" width={56} height={56} loading="lazy" /> : <span className="ph" aria-hidden="true">{initials(i.name)}</span>}
                <b>{i.name}</b>
                {i.name_hangul ? <span className="hg">{i.name_hangul}</span> : null}
                {i.positions.length ? <span className="role">{i.positions.join(' · ')}</span> : null}
              </>);
              return ps ? <Link key={i.id} className="vh2-member" href={`/verse/${slug}/${ps}`}>{inner}</Link> : <div key={i.id} className="vh2-member">{inner}</div>;
            })}
          </div>
        </section>
      ) : null}

      {/* DISCOGRAPHY */}
      {albums.length ? (
        <section className="vh2-sec" id="sec-discography" data-toc="Discography">
          <div className="vh2-sechead"><h2>Discography</h2><Link className="vh2-more" href={`/verse/${slug}/discography`}>All {albums.length} releases &#8594;</Link></div>
          <div className="vh2-covers">
            {albums.map((a) => {
              const ps = pageSlug.get(`album:${a.id}`);
              const inner = (<>
                <span className="art" aria-hidden="true">{initials(a.title)}</span>
                <b>{a.title}</b>
                <span>{[yearOf(a.release_date), RELEASE_TYPE[a.type?.toLowerCase()] ?? a.type].filter(Boolean).join(' · ')}</span>
              </>);
              return ps ? <Link key={a.id} className="vh2-coveritem" href={`/verse/${slug}/${ps}`}>{inner}</Link> : <div key={a.id} className="vh2-coveritem">{inner}</div>;
            })}
          </div>
        </section>
      ) : null}

      {/* THE STORY SO FAR - eras */}
      {eras.length ? (
        <section className="vh2-sec" id="sec-story" data-toc="The story so far">
          <div className="vh2-sechead"><h2>The story so far</h2><Link className="vh2-more" href={`/verse/${slug}/timeline`}>All {eras.length} eras &#8594;</Link></div>
          <div className="vh2-story">
            {eras.map((e, i) => {
              const ps = pageSlug.get(`era:${e.id}`);
              const ys = yearOf(e.periodStart);
              const ye = yearOf(e.periodEnd);
              const years = ys ? (ye && ye !== ys ? `${ys} · ${ye}` : ys) : '';
              return (
                <div className="vh2-era" key={e.id}>
                  <div className="yr">{years}</div>
                  <div>
                    <h3>{ps ? <Link href={`/verse/${slug}/${ps}`}>{e.name}</Link> : e.name}{i === 0 ? <span className="nowtag">Now</span> : null}</h3>
                    {e.storyExcerpt ? <p>{e.storyExcerpt}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* COMMUNITY & PLAY */}
      <section className="vh2-sec" id="sec-community" data-toc="Community & Play">
        <div className="vh2-cards">
          <div className="vh2-card">
            <h3>{g.fandom_name}, the fandom</h3>
            <p>The people who build this space. The story of the fandom itself lives here, alongside the members and the music.</p>
            <div className="links">
              <Link href={`/verse/${slug}/community`}>Community</Link>
              <Link href={`/verse/${slug}/fandom`}>Fandom</Link>
            </div>
          </div>
          {quizzes.length ? (
            <div className="vh2-card">
              <h3>Play what you know</h3>
              <p>Every page connects back to the games. Test your era knowledge, guess the song, or name the members against the clock.</p>
              <div className="links">{quizzes.map((q) => <Link key={q.id} href={`/q/${q.slug}`}>{q.title}</Link>)}</div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

// A short, DB-TRUE derived lede for the Overview when no authored prose exists yet.
function derive(g: Space['group'], counts: Space['counts'], eraCount: number, factCount: number): string[] {
  const year = g.inception_date?.slice(0, 4) ?? null;
  const gen = g.generation ? g.generation.replace(/\bGen\.?$/i, 'generation') : null;
  const bits = [`${g.name}`, gen ? `a ${gen} act` : null, g.origin_country ? `from ${g.origin_country}` : null].filter(Boolean).join(', ');
  const s1 = `${bits}${year ? `, debuted in ${MONTHS_LONG[Number(g.inception_date!.slice(5, 7)) - 1]} ${year}` : ''}.`;
  const s2 = `This space keeps the catalog together: ${counts.members} members, ${counts.albums} releases${eraCount ? `, ${eraCount} eras` : ''}${factCount ? ` and ${factCount} sourced facts` : ''}, documented by the fans who care about it.`;
  return [s1, s2];
}
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
