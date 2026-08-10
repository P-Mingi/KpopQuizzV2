// PART B - the redesigned auto-list INDEX (no more empty boxes). From verse-child-templates.html
// (Template 1): a short DB-true intro line + a mono meta line, then rich cards - a thumb, the
// title, a mono type/meta line, and on HOVER the card lifts + reveals a one-line description
// (the page's own first paragraph, real prose) + a go-arrow. The whole card stays a crawlable <a>.
// Every value is DB-derived; nothing is fabricated. Mobile: the reveal is always shown.
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { PageRow } from '@/lib/verse/tree/types';

const RELEASE_TYPE: Record<string, string> = { ep: 'EP', album: 'Album', single: 'Single', compilation: 'Compilation', mixtape: 'Mixtape' };
const yearOf = (iso: string | null): string | null => iso?.match(/^(\d{4})/)?.[1] ?? null;
const initials = (s: string): string => s.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();

interface Kid { slug: string; title: string; type: string; entity_kind: string | null; entity_id: number | null; blocks: unknown; }
interface Card { slug: string; title: string; meta: string; reveal: string | null; photo: string | null; sortKey: string; }

// the page's first real paragraph, trimmed to a single line (real prose, never fabricated).
function firstProse(blocks: unknown): string | null {
  const bs = ((blocks as { blocks?: { type: string; content?: { text?: string }[] }[] } | null)?.blocks ?? []);
  for (const b of bs) {
    if (b.type === 'paragraph') {
      const t = (b.content ?? []).map((r) => r.text ?? '').join('').trim();
      if (t && !/^sources\.?/i.test(t)) return t.length > 116 ? `${t.slice(0, 114).trimEnd()}…` : t;
    }
  }
  return null;
}

export async function VerseIndexPage({ spaceSlug, spaceId, spaceName, page }: {
  spaceSlug: string; spaceId: number; spaceName: string; page: PageRow;
}): Promise<React.ReactElement> {
  const svc = createServiceRoleClient();
  const { data: kidRows } = await svc.from('pages')
    .select('slug, title, type, entity_kind, entity_id, blocks')
    .eq('space_id', spaceId).eq('parent_id', page.id).eq('status', 'published')
    .neq('type', 'index').neq('type', 'portal').limit(1000);
  const kids = (kidRows as Kid[] | null) ?? [];

  // enrich each card with DB-derived meta by entity_kind (albums: year+type; idols: role+photo;
  // eras: years). One batched read per kind.
  const idFor = (k: string): number[] => [...new Set(kids.filter((c) => c.entity_kind === k && c.entity_id != null).map((c) => c.entity_id as number))];
  const albumIds = idFor('album'); const idolIds = idFor('idol'); const eraIds = idFor('era');
  const [albumsRes, idolsRes, erasRes] = await Promise.all([
    albumIds.length ? svc.from('albums').select('id, release_date, type, region').in('id', albumIds) : Promise.resolve({ data: [] }),
    idolIds.length ? svc.from('idols').select('id, positions, photo_url, ord').in('id', idolIds) : Promise.resolve({ data: [] }),
    eraIds.length ? svc.from('eras').select('id, period_start, period_end').in('id', eraIds) : Promise.resolve({ data: [] }),
  ]);
  const albums = new Map(((albumsRes.data as { id: number; release_date: string | null; type: string; region: string }[] | null) ?? []).map((a) => [a.id, a]));
  const idols = new Map(((idolsRes.data as { id: number; positions: string[] | null; photo_url: string | null; ord: number }[] | null) ?? []).map((i) => [i.id, i]));
  const eras = new Map(((erasRes.data as { id: number; period_start: string | null; period_end: string | null }[] | null) ?? []).map((e) => [e.id, e]));

  const cards: Card[] = kids.map((k) => {
    let meta = k.entity_kind ? k.entity_kind.toUpperCase() : k.type.toUpperCase();
    let photo: string | null = null;
    let sortKey = k.title.toLowerCase();
    if (k.entity_kind === 'album' && k.entity_id != null && albums.has(k.entity_id)) {
      const a = albums.get(k.entity_id)!;
      meta = [yearOf(a.release_date), RELEASE_TYPE[a.type?.toLowerCase()] ?? a.type].filter(Boolean).join(' · ');
      sortKey = `0${a.release_date ?? '0000'}`; // newest first (reversed below)
    } else if (k.entity_kind === 'idol' && k.entity_id != null && idols.has(k.entity_id)) {
      const i = idols.get(k.entity_id)!;
      meta = i.positions && i.positions.length ? i.positions.join(' · ') : 'Member';
      photo = i.photo_url;
      sortKey = `0${String(i.ord).padStart(3, '0')}`;
    } else if (k.entity_kind === 'era' && k.entity_id != null && eras.has(k.entity_id)) {
      const e = eras.get(k.entity_id)!;
      const ys = yearOf(e.period_start); const ye = yearOf(e.period_end);
      meta = ys ? (ye && ye !== ys ? `${ys} · ${ye}` : ys) : 'Era';
      sortKey = `0${e.period_start ?? '0000'}`;
    }
    return { slug: k.slug, title: k.title, meta, reveal: firstProse(k.blocks), photo, sortKey };
  });

  // sort: releases + eras newest first (date desc), members by ord, everything else A-Z.
  const dominant = kids[0]?.entity_kind;
  if (dominant === 'album' || dominant === 'era') cards.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  else cards.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const n = cards.length;
  const intro = introFor(dominant ?? null, n, spaceName, page.title);
  const metaLine = metaFor(dominant ?? null, n);

  return (
    <div className="verse-page verse-scope vix">
      <nav className="vix-crumb" aria-label="Breadcrumb">
        <a href={`/verse/${spaceSlug}`}>{spaceName}</a><span className="sep">/</span>{page.title}
      </nav>
      <h1 className="vix-title">{page.title}</h1>
      {n > 0 ? <p className="vix-intro">{intro}</p> : null}
      <p className="vix-metaline">{metaLine}</p>
      {n > 0 ? (
        <div className="vix-grid">
          {cards.map((c) => (
            <a key={c.slug} className="vix-card" href={`/verse/${spaceSlug}/${c.slug}`}>
              <span className="vix-go" aria-hidden="true">&#8594;</span>
              {c.photo
                ? <img className="vix-art" src={c.photo} alt="" loading="lazy" />
                : <span className="vix-art" aria-hidden="true">{initials(c.title)}</span>}
              <b>{c.title}</b>
              <span className="k">{c.meta}</span>
              {c.reveal ? <span className="vix-reveal">{c.reveal}</span> : null}
            </a>
          ))}
        </div>
      ) : <p className="vix-empty">No pages here yet.</p>}
    </div>
  );
}

function introFor(kind: string | null, n: number, space: string, title: string): string {
  if (kind === 'album') return `${n} release${n === 1 ? '' : 's'}, newest first. Every album, EP and single in the ${space} catalogue with its own page.`;
  if (kind === 'idol') return `The ${n} member${n === 1 ? '' : 's'} of ${space}, each with a page of their own.`;
  if (kind === 'era') return `${n} era${n === 1 ? '' : 's'}: the chapters of the ${space} story, newest first.`;
  return `${n} page${n === 1 ? '' : 's'} in ${title}, listed automatically.`;
}
function metaFor(kind: string | null, n: number): string {
  const noun = kind === 'album' ? 'releases' : kind === 'idol' ? 'members' : kind === 'era' ? 'eras' : 'pages';
  const order = kind === 'album' || kind === 'era' ? 'newest first' : kind === 'idol' ? 'by position' : 'A to Z';
  return `${n} ${noun} · ${order} · auto-listed`;
}
