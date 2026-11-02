// Run O1, lot P5 (CR-025): the rows kpopquiz.org and OtakuQuiz read for the pages of the screenshots, served by the same local stand-in as the hub (serve-preview.run.ts). A small PostgREST
// emulator: the tables below answer `col=eq.value`, `col=in.(a,b)`, `limit` and `Range`; every other table is empty. The groups of KpopQuiz are the groups named in the pool of Kpopdle, so a name
// of the pool is a name of a group (as in production); the songs are made up (12 a group) only to open each group's blind test. Nothing here is a real count, it only fills a local preview.
// Nothing leaves the machine and no remote database is touched.
export interface PoolEntity { name: string; attrs: Record<string, { v?: unknown; p?: string[] }> }

type Row = Record<string, unknown>;

const NOW = Date.now();
const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const iso = (i: number): string => new Date(NOW - i * 3_600_000).toISOString();


function groupRow(id: number, name: string, site: 'kpop' | 'anime', extra: Row = {}): Row {
  return {
    id, name, slug: slugify(name), fandom_name: site === 'kpop' ? 'ONCE' : 'Fans', display_color: site === 'kpop' ? '#d13a6e' : '#c2410c', text_color: '#ffffff', logo_url: null,
    quiz_count: 4, total_plays: 5000, is_custom: false, needs_review: false, created_by_user: false, generation: site === 'kpop' ? '3rd Gen' : null, member_count: 9, debut_year: 2015, company: 'JYP',
    description: `${name} is a group.`, seo_intro: null, is_active: true, created_at: '2020-01-01T00:00:00Z', site_id: site, site, genre: site, ...extra,
  };
}

function quizRow(i: number, g: Row, site: 'kpop' | 'anime'): Row {
  const name = String(g.name);
  return {
    id: `00000000-0000-4000-8000-${String(Number(g.id) * 10 + i + (site === 'kpop' ? 0 : 100_000)).padStart(12, '0')}`, title: `${name} quiz number ${i}`, slug: `${g.slug}-quiz-${i}`, quiz_type: 'multiple_choice', difficulty: ['easy', 'medium', 'hard'][i % 3],
    language: 'en', play_count: 1200 - i * 90, total_score_sum: 400, total_completions: 40, like_count: 12, question_count: 5, created_at: iso(i), cover_image_url: null, first_question: `Question one of ${name}?`,
    group_id: g.id, status: 'published', creator_id: 'u-1', site_id: site, spoiler_arc_ord: null, spoiler_scope: null,
    settings: { timer: false, timer_seconds: 15, shuffle: false, show_answers: true },
    questions: Array.from({ length: 5 }, (_, q) => ({ question: `Question ${q + 1} about ${name}?`, options: ['First answer', 'Second answer', 'Third answer', 'Fourth answer'], correct: 0, fun_fact: `A fact about ${name}.` })),
    groups: { name, slug: g.slug, display_color: g.display_color, text_color: g.text_color, fandom_name: g.fandom_name, logo_url: null },
    profiles: { username: 'fan', avatar_url: null, avatar_bg: '#222222', avatar_text: '#ffffff', xp: 10 },
  };
}

export class Fixtures {
  readonly kpopGroups: Row[];
  readonly animeGroups: Row[];
  readonly quizzes: Row[];
  readonly songs: Row[];
  readonly seen = new Map<string, number>();

  constructor(pool: readonly PoolEntity[], animeNames: readonly string[]) {
    const names = [...new Set(pool.map((e) => e.attrs.group?.p?.[0] ?? String((Array.isArray(e.attrs.group?.v) ? e.attrs.group?.v[0] : e.attrs.group?.v) ?? '')).filter(Boolean))];
    // TWICE first: the group of the screenshots.
    names.sort((a, b) => (a === 'TWICE' ? -1 : b === 'TWICE' ? 1 : a.localeCompare(b)));
    this.kpopGroups = names.map((n, i) => groupRow(i + 1, n, 'kpop'));
    this.animeGroups = animeNames.map((n, i) => groupRow(101 + i, n, 'anime', { fandom_name: 'Fans', generation: null }));
    this.quizzes = [
      ...this.kpopGroups.slice(0, 6).flatMap((g) => [1, 2, 3, 4].map((i) => quizRow(i, g, 'kpop'))),
      ...this.animeGroups.flatMap((g) => [1, 2, 3, 4].map((i) => quizRow(i, g, 'anime'))),
    ];
    // Twelve songs a K-pop group: the blind test of a group opens from ten.
    this.songs = this.kpopGroups.flatMap((g) => Array.from({ length: 12 }, (_, k) => ({ id: Number(g.id) * 100 + k, group_id: g.id, title: `${g.name} song ${k}`, status: 'active', site_id: 'kpop' })));
  }

  private table(name: string, site: string | null): Row[] | null {
    switch (name) {
      case 'groups': return site === 'anime' ? this.animeGroups : site === 'kpop' ? this.kpopGroups : [...this.kpopGroups, ...this.animeGroups];
      case 'quizzes': return this.quizzes;
      case 'songs': return this.songs;
      case 'series': return this.animeGroups.map((g) => ({
        group_id: g.id, published: true, type: 'anime', title_en: g.name, title_native: null, title_romaji: null, studios: [{ name: 'Toei Animation' }], authors: [], anime_start_year: 1999, anime_end_year: null,
        manga_start_year: 1997, manga_end_year: null, status: 'airing', episodes: null, chapters: null, chapters_approx: false, volumes: null, seasons: null, airing: null,
      }));
      case 'arcs': return [];
      case 'characters': return [];
      default: return null;
    }
  }

  /** The rows a request would get, or null for a table this stand-in does not know (the caller answers an empty list). */
  rows(tableName: string, params: URLSearchParams): Row[] | null {
    this.seen.set(tableName, (this.seen.get(tableName) ?? 0) + 1);
    let rows = this.table(tableName, params.get('site_id')?.replace(/^eq\./, '') ?? null);
    if (!rows) return null;
    for (const [k, v] of params.entries()) {
      if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
      const eq = /^eq\.(.*)$/.exec(v);
      const inn = /^in\.\((.*)\)$/.exec(v);
      if (eq) rows = rows.filter((r) => k in r ? String(r[k]) === eq[1] : true);
      else if (inn) rows = rows.filter((r) => k in r ? inn[1]!.split(',').map((x) => x.replace(/^"|"$/g, '')).includes(String(r[k])) : true);
    }
    const limit = Number(params.get('limit'));
    return Number.isFinite(limit) && limit > 0 ? rows.slice(0, limit) : rows;
  }
}
