import { describe, expect, it } from 'vitest';

import { forbiddenIn } from './page-copy';
import raw from './rosters.json';
import { currentProfiles, getRoster, rosterSlugs, sourcedRole, wikipediaUrl } from './rosters';

// SEO Mission 2, part D: the sourced line-ups of the Which member are you pages
// (scripts/fetch-wma-rosters.mjs writes rosters.json: Wikidata and Wikipedia agree).

/** The groups relaunched with a page (next.config.ts WMA_GROUPS); the file covers each. */
const PAGES = ['aespa', 'ateez', 'blackpink', 'bts', 'enhypen', 'g-i-dle', 'itzy', 'ive', 'le-sserafim', 'newjeans', 'nmixx', 'seventeen', 'stray-kids', 'twice', 'txt'];

const MEMBER_KEYS = new Set(['profile', 'name', 'wikipediaName', 'wikidata', 'role', 'team', 'note']);
const GROUP_KEYS = new Set(['wikidata', 'wikipedia', 'official', 'countAgreed', 'minors', 'members', 'former']);

describe('rosters.json', () => {
  it('covers every page, each with a Wikidata item, a Wikipedia article and members', () => {
    expect(rosterSlugs()).toEqual([...PAGES].sort());
    for (const slug of PAGES) {
      const r = getRoster(slug);
      expect(r, slug).not.toBeNull();
      expect(r!.wikidataUrl).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q[1-9]\d*$/);
      expect(r!.wikipediaUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\/[^\s]+#Members$/);
      expect(r!.members.length).toBeGreaterThanOrEqual(4);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(r!.checkedOn)).toBe(true);
    }
  });

  it('stores stage names, roles and source IDs only: no birth date, age, body or private field', () => {
    const groups = (raw as { groups: Record<string, Record<string, unknown>> }).groups;
    for (const [slug, g] of Object.entries(groups)) {
      for (const k of Object.keys(g)) expect(GROUP_KEYS.has(k), `${slug}.${k}`).toBe(true);
      for (const m of g.members as Array<Record<string, unknown>>) {
        for (const k of Object.keys(m)) expect(MEMBER_KEYS.has(k), `${slug} member key ${k}`).toBe(true);
        expect(String(m.wikidata)).toMatch(/^Q[1-9]\d*$/);
        expect(typeof m.wikipediaName).toBe('string');
      }
    }
    const text = JSON.stringify(raw);
    expect(forbiddenIn(text.replace(/"_about":"[^"]*"/, ''))).toEqual([]);
    expect(/[\u2013\u2014]/.test(text), 'no em or en dash').toBe(false);
    expect(/\b(19|20)\d{2}-\d{2}-\d{2}\b/.test(text.replace(/"checkedOn":"[^"]*"/, '')), 'no date other than the check date').toBe(false);
  });

  it('roles are public roles only (leader, vocalist, rapper, dancer, unit or production credits)', () => {
    const word = /^(group leader|leader|vocalist|rapper|dancer|performance|composer|producer|hip-hop unit leader|vocal unit leader|performance unit leader)$/;
    for (const slug of PAGES) {
      for (const m of getRoster(slug)!.members) {
        if (!m.role) continue;
        for (const part of m.role.toLowerCase().split(', ')) expect(part, `${slug}/${m.name}`).toMatch(word);
      }
    }
  });

  it('a member has one row per group and every quiz profile of a current member is in it once', () => {
    for (const slug of PAGES) {
      const r = getRoster(slug)!;
      const ids = r.members.map((m) => m.wikidata);
      expect(new Set(ids).size).toBe(ids.length);
      const profiles = r.members.map((m) => m.profile).filter(Boolean);
      expect(new Set(profiles).size).toBe(profiles.length);
    }
  });
});

describe('currentProfiles', () => {
  const p = (id: string) => ({ id, name: id });
  it('drops a profile both sources list as a former member', () => {
    expect(currentProfiles('enhypen', [p('jay'), p('heeseung'), p('jungwon')]).map((x) => x.id)).toEqual(['jay', 'jungwon']);
    expect(currentProfiles('newjeans', [p('minji'), p('danielle'), p('hanni')]).map((x) => x.id)).toEqual(['minji', 'hanni']);
  });
  it('keeps a profile the sources do not mention, and everything for a group without a roster', () => {
    expect(currentProfiles('bts', [p('rm'), p('someone-new')]).map((x) => x.id)).toEqual(['rm', 'someone-new']);
    expect(currentProfiles('no-such-group', [p('a'), p('b')]).map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('sourcedRole', () => {
  it('gives the Wikipedia role, with the team when the role does not name it', () => {
    expect(sourcedRole('bts', 'rm')).toBe('Leader, rapper');
    expect(sourcedRole('stray-kids', 'bang-chan')).toBe('Leader, vocalist, rapper, dancer');
    expect(sourcedRole('seventeen', 'wonwoo')).toBe('Rapper, hip-hop team');
    expect(sourcedRole('seventeen', 'woozi')).toBe('Vocal unit leader, vocalist, producer');
  });
  it('gives nothing when the source lists no role, or for an unknown member or group', () => {
    expect(sourcedRole('enhypen', 'jay')).toBeNull();
    expect(sourcedRole('bts', 'nobody')).toBeNull();
    expect(sourcedRole('no-such-group', 'rm')).toBeNull();
  });
  it('never uses the positions the sources reject (main, lead, sub, visual, center) or age', () => {
    for (const slug of PAGES) {
      for (const m of getRoster(slug)!.members) {
        const role = sourcedRole(slug, m.profile ?? '') ?? '';
        expect(/\b(main|lead|sub|visual|center|centre|maknae|youngest|oldest)\b/i.test(role), `${slug}/${m.name}: ${role}`).toBe(false);
      }
    }
  });
});

describe('wikipediaUrl', () => {
  it('builds the article URL from its title', () => {
    expect(wikipediaUrl('Ive (group)')).toBe('https://en.wikipedia.org/wiki/Ive_(group)');
    expect(wikipediaUrl('Seventeen (South Korean band)')).toBe('https://en.wikipedia.org/wiki/Seventeen_(South_Korean_band)');
  });
});
