// Run O1 (OSHI): where the oshi shows and where it never does. It shows on the fan's OtakuQuiz profile (the oshi slot of the anime
// profile) and nowhere else: not in HubShares, not on fandomverse.org, not on kpopquiz.org, not in any cross-site payload.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HubShares } from '@/components/hub/hub-shares';
import { OshiTag } from '@/components/passport-ui/oshi-tag';
import { COPY as H1 } from '@/copy/hub/h1';
import { buildNetMe } from '@/lib/network/me';
import { profileForSite } from '@/lib/network/profile';
import { OWN_MEMBERSHIP_COLUMNS, MEMBER_MEMBERSHIP_COLUMNS } from '@/lib/site/hub/redirects';
import { SHARES_HIDES, SHARES_SEES } from '@/lib/site/hub/network-page';
import { ht } from '@/lib/site/hub/copy';
import { worldSpine } from '@/lib/passport-ui/world-reads';
import { pickOfferWords } from '@/lib/personality/view';
import { siteConfig } from '@/lib/site/registry';

import type { MemberPublic, MyPassportRow, ProfileForSiteInput } from '@/lib/passport/types';

const PROFILE: ProfileForSiteInput = {
  id: 'u1', username: 'fan', display_name: 'Fan Name', avatar_url: null, avatar_bg: '#111111', avatar_text: '#eeeeee', bio: 'I stan K-pop',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z', total_quizzes_created: 0, total_plays_received: 0,
  total_likes_received: 0, xp: 9000, follower_count: 0, following_count: 0, name_accent: 'pink', name_font: 'serif', pinned_badge_id: null,
  avatar_kind: 'photo', avatar_ref: null, stan_since: 2016, header_url: null, bias: 'Karina', ult_groups: [], profile_theme: 'default',
};
const ANIME_MEMBER: MemberPublic = {
  site_id: 'anime', joined_at: '2026-10-01T00:00:00Z', xp: 150, quizzes_played: 4, blindtests_played: 1, games_played: 0, quizzes_created: 2,
  plays_received: 30, likes_received: 5, follower_count: 3, following_count: 4, daily_streak: 2, daily_streak_longest: 6,
  last_daily_date: '2026-10-18', bio: null, header_url: null, profile_theme: null, pinned_badge_id: null, display_name_override: null,
  avatar_override: null, tag_text: 'Light Yagami', since_year: null,
};
const OSHI = /oshi|Light Yagami|favourite_characters/i;

describe('the oshi shows on the OtakuQuiz profile', () => {
  it('the profile of the anime site carries it as its pick tag, the vocabulary says Oshi and the tag is a star', () => {
    const anime = siteConfig('anime').vocabulary.favourites;
    expect(anime.pickLabel).toBe('Oshi');
    expect(anime.pickIcon).toBe('star');
    expect(profileForSite('anime', PROFILE, ANIME_MEMBER).bias).toBe('Light Yagami');
    expect(worldSpine(ANIME_MEMBER, []).bias).toBe('Light Yagami');
    expect(renderToStaticMarkup(createElement(OshiTag, { name: 'Light Yagami' }))).toContain('Light Yagami');
  });

  it('a fan with no oshi has no pick tag on the anime profile (never the kpop bias)', () => {
    expect(profileForSite('anime', PROFILE, { ...ANIME_MEMBER, tag_text: null }).bias).toBeNull();
    expect(profileForSite('anime', PROFILE, null).bias).toBeNull();
  });
});

describe('the words of the offer say where it shows', () => {
  it('kpop keeps its sentence (next to the name in Community); anime says on your profile', () => {
    expect(pickOfferWords(siteConfig('kpop').vocabulary.favourites.pickLabel).where).toBe('next to your name in Community');
    expect(pickOfferWords(siteConfig('anime').vocabulary.favourites.pickLabel).where).toBe('on your profile');
  });
});

describe('the oshi is absent everywhere else', () => {
  it('kpopquiz.org: the profile is the shared profile as it is, even when the account has an oshi on anime', () => {
    const p = profileForSite('kpop', PROFILE, ANIME_MEMBER);
    expect(p).toBe(PROFILE);
    expect(p.bias).toBe('Karina');
    expect(JSON.stringify(p)).not.toMatch(OSHI);
  });

  it('HubShares (home and privacy): what the other sites see and never see names no oshi, no character, no tag', () => {
    for (const html of [renderToStaticMarkup(HubShares()), renderToStaticMarkup(HubShares({ variant: 'home' }))]) {
      expect(html).not.toMatch(/oshi|favourite|character|\btag\b/i);
    }
    for (const k of [...SHARES_SEES, ...SHARES_HIDES]) expect(ht(k)).not.toMatch(/oshi|favourite|character|\btag\b/i);
  });

  it('fandomverse.org: no string of the hub copy speaks of an oshi', () => {
    expect(Object.values(H1).filter((v) => /oshi/i.test(v))).toEqual([]);
  });

  it('cross-site payloads: GET /api/n/me (NetMe) built from the passport rows holds no oshi', () => {
    const rows: MyPassportRow[] = [{
      site_id: 'anime', joined_at: '2026-10-01T00:00:00Z', joined_via: 'signup', via_code: null, activated_at: '2026-10-02T00:00:00Z', xp: 150,
      plays: 5, daily_streak: 2, quizzes_created: 2, show_elsewhere: true,
    }];
    const me = buildNetMe(rows, null);
    expect(Object.keys(me.sites[0]!).sort()).toEqual(['activated', 'id', 'joinedAt', 'level', 'plays']);
    expect(JSON.stringify(me)).not.toMatch(OSHI);
  });

  it('cross-site reads: the columns the hub reads of a membership (own and another member) never include tag_text', () => {
    expect(OWN_MEMBERSHIP_COLUMNS).not.toContain('tag_text');
    expect(MEMBER_MEMBERSHIP_COLUMNS).not.toContain('tag_text');
  });

  it('the two passport functions of the contract return no tag and no oshi', () => {
    const sql = readFileSync(fileURLToPath(new URL('../../../../../docs/o1/contracts/schema.sql', import.meta.url)), 'utf8');
    for (const fn of ['public_passport(p_username text)', 'my_passport()']) {
      const at = sql.indexOf(`create function public.${fn}`);
      expect(at).toBeGreaterThan(0);
      const head = sql.slice(at, sql.indexOf('language', at));
      expect(head).not.toMatch(/tag_text|oshi|character|favourite/i);
    }
  });
});

// The code that reads or writes an oshi is a short list of anime files. A file outside it (kpop pages, the hub, the passport and the
// network code, the shared API routes) that names the oshi table or the save module fails here.
describe('who touches the oshi', () => {
  const SRC = fileURLToPath(new URL('../../', import.meta.url));
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const f = join(dir, name);
      if (statSync(f).isDirectory()) { if (name !== 'node_modules') walk(f); } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) files.push(f);
    }
  };
  walk(SRC);
  const hits = (re: RegExp): string[] => files.filter((f) => re.test(readFileSync(f, 'utf8'))).map((f) => relative(SRC, f)).sort();

  it('favourite_characters is read and written by the anime files only', () => {
    expect(hits(/favourite_characters/)).toEqual([
      'components/anime/character-tiles.tsx',
      'components/passport-ui/settings-world.tsx',
      'lib/anime/types.ts',
      'lib/db/contract.types.ts',
      'lib/passport-ui/oshi.ts',
      'lib/passport-ui/settings-world.ts',
      'lib/personality/oshi-offer.ts',
    ]);
  });

  it('the save module is reached from the quiz component only, by a dynamic import behind the site check', () => {
    expect(hits(/oshi-offer/)).toEqual(['components/personality/quiz.tsx']);
    const quiz = readFileSync(join(SRC, 'components/personality/quiz.tsx'), 'utf8');
    expect(quiz).not.toMatch(/import\s[^;]*from\s+'@\/lib\/personality\/oshi-offer'/);
    expect(quiz).toMatch(/if \(SITE\.id !== 'kpop'\) \{[\s\S]*import\('@\/lib\/personality\/oshi-offer'\)/);
  });

  it('the kpop branch of the quiz still writes the bias of the shared profile and nothing of the oshi', () => {
    const quiz = readFileSync(join(SRC, 'components/personality/quiz.tsx'), 'utf8');
    const kpop = quiz.slice(quiz.indexOf("fetch('/api/auth/update-profile'"));
    expect(kpop).toMatch(/JSON\.stringify\(\{ bias: name \}\)/);
    expect(kpop.slice(0, kpop.indexOf('finally'))).not.toMatch(/oshi|favourite|membership/i);
  });

  it('signed out, the offer opens the sign-in sheet and saves after the return (the same pending action as the kpop bias)', () => {
    const quiz = readFileSync(join(SRC, 'components/personality/quiz.tsx'), 'utf8');
    expect(quiz).toMatch(/if \(!signedIn\) \{\s*signIn\(\{[\s\S]*?action: \{ id: BIAS_ACTION, payload: \{ bias: name \} \}/);
    expect(quiz).toMatch(/takePendingAction\(BIAS_ACTION\)/);
  });

  it('no hub, kpop route, passport or network file names an oshi tag column of a membership', () => {
    const outside = files.map((f) => relative(SRC, f)).filter((f) =>
      /^(app\/\(site\)|app\/sites\/\[site\]\/\(hub\)|components\/hub|lib\/network|lib\/passport\/|lib\/site\/hub)/.test(f));
    expect(outside.length).toBeGreaterThan(10);
    const bad = outside.filter((f) => f !== 'lib/passport/types.ts' && /tag_text|favourite_characters|oshi/i.test(readFileSync(join(SRC, f), 'utf8')));
    expect(bad).toEqual([]);
  });
});

describe('the page that carries the offer opens on a production build', () => {
  it('the series quiz page is rendered per request (the [site] layout allows no param that was not generated, else a NoFallbackError 404)', () => {
    const page = readFileSync(fileURLToPath(new URL('../../app/sites/[site]/(anime)/which-character/[group]/page.tsx', import.meta.url)), 'utf8');
    expect(page).toMatch(/^export const dynamic = 'force-dynamic';$/m);
    expect(page).toMatch(/^export const dynamicParams = true;$/m);
    const layout = readFileSync(fileURLToPath(new URL('../../app/sites/[site]/layout.tsx', import.meta.url)), 'utf8');
    expect(layout).toMatch(/^export const dynamicParams = false;$/m);
  });
});
