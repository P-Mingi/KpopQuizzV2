// Run O1, lot (b), lane P1: the data of /me and /u/{username} of a world site (anime), shaped for the shared kpop passport
// (components/profile/ux-v1/passport) from the membership of this site (rule 18, rpcs.md section 4). The page files under
// app/sites/[site] import the shared passport themselves and render what these return. Server only.
//
//  - /me: the signed-in user's own page. A guest gets the invitation; a user without a profile goes to /onboarding; a
//    banned one gets a 404. Level, streak and counters come from the world XP and the membership (profileForSite and
//    worldSpine); the history, the average and the series count look at the quizzes of this site only.
//  - /u/{username}: another member, read with the service role and the public columns only. 404 when there is no
//    membership on this site, it is not activated, or it is banned; always noindex.

import { notFound, redirect } from 'next/navigation';

import { computeMetrics, grantEarnedTiers } from '@/lib/badges/award';
import { getQuizzesByCreator } from '@/lib/db/queries/quizzes';
import { safeFetch } from '@/lib/error-handling';
import { readPassportGroupStats } from '@/lib/passport';
import { SITE, SITE_ID } from '@/lib/site/registry';
import { forSite } from '@/lib/site/scope';
import { createPublicReadClient, createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { buildPassport } from '@/lib/ux-v1/p10/build-passport';
import { readTeamIdentity } from '@/lib/ux-v1/p10/passport-data';

import { p1 } from './copy';
import { passportWords } from './words';
import {
  readOwnWorldMember, readSeriesSlugs, readSiteSeries, readWorldAverage, readWorldHistory, readWorldMember, worldCollection,
  worldGroupStats, worldSpine,
} from './world-reads';

import type { Metadata } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BadgeDefinition, Profile, UserBadge } from '@/lib/db/types';
import type { MemberPublic } from '@/lib/passport/types';
import type { PassportInput, PassportProps } from '@/lib/ux-v1/p10/build-passport';
import type { PassportWords } from './words';

/** Props of the shared passport for a member of this site: the kpop view model fed with the membership. Exported for the tests. */
export async function worldPassportInput(args: {
  readonly mode: 'personal' | 'public';
  readonly db: SupabaseClient;
  readonly userClient: SupabaseClient;
  readonly profile: Profile;
  readonly membership: MemberPublic | null;
  readonly words: PassportWords;
  readonly now: number;
  readonly withExtras: boolean;
}): Promise<PassportInput> {
  const { db, profile, mode } = args;
  const reader = mode === 'personal' ? args.userClient : db;
  const [slugs, stats, series, quizzes, defsRes, earnedRes] = await Promise.all([
    readSeriesSlugs(db, profile.id, SITE_ID),
    readPassportGroupStats(db, profile.id).catch(() => []),
    readSiteSeries(db, SITE_ID),
    safeFetch(getQuizzesByCreator(profile.id, 0, 10), [], '[world passport] getQuizzesByCreator'),
    safeFetch(Promise.resolve(forSite(db.from('badge_definitions').select('*')).order('sort_order')), { data: null } as { data: unknown }, '[world passport] badge_definitions'),
    safeFetch(Promise.resolve(db.from('user_badges').select('badge_id, earned_at').eq('user_id', profile.id)), { data: null } as { data: unknown }, '[world passport] user_badges'),
  ]);
  const ids = new Set(series.map((g) => g.id));
  const [averagePct, history, team] = await Promise.all([
    args.withExtras ? readWorldAverage(reader, profile.id, SITE_ID) : Promise.resolve(null),
    args.withExtras ? readWorldHistory(reader, profile.id, SITE_ID, 20) : Promise.resolve(null),
    readTeamIdentity(profile.id),
  ]);
  return {
    mode,
    profile,
    spine: worldSpine(args.membership, slugs),
    groupStats: worldGroupStats(stats, ids),
    collection: worldCollection(stats, ids),
    groups: series,
    badgeDefs: (defsRes.data ?? []) as BadgeDefinition[],
    earnedBadgeIds: ((earnedRes.data ?? []) as UserBadge[]).map((b) => b.badge_id),
    quizzes,
    fandomName: null,
    war: null,
    averagePct,
    history,
    team,
    now: args.now,
    words: args.words,
    site: SITE_ID,
  };
}

function words(): PassportWords {
  const w = passportWords(SITE_ID);
  if (!w) notFound();
  return w;
}

/** The link to the whole passport on the network site, a same-origin jump that exists for signed-in members (apis.md 2.1). */
export function wholePassportHref(): string {
  return `/auth/passport/out?to=hub&next=${encodeURIComponent('/passport')}&via=${SITE.letter}.pp`;
}

async function stampCount(supabase: SupabaseClient): Promise<number> {
  try {
    const { data } = await supabase.rpc('my_passport');
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export function worldMeMetadata(): Metadata {
  return { title: p1('me.title'), robots: { index: false, follow: false } };
}

export type WorldMe =
  | { readonly kind: 'guest'; readonly words: PassportWords }
  | { readonly kind: 'passport'; readonly props: PassportProps; readonly multiSite: boolean };

/** /me: a guest gets the invitation, a user without a profile goes to /onboarding, a banned one gets a 404. */
export async function loadWorldMe(): Promise<WorldMe> {
  const w = words();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { kind: 'guest', words: w };

  const own = await readOwnWorldMember(supabase as unknown as SupabaseClient, user.id, SITE_ID);
  if (!own) redirect('/onboarding');
  if (own.banned) notFound();

  const service = createServiceRoleClient() as unknown as SupabaseClient;
  const metrics = await computeMetrics(service, user.id).catch(() => null);
  if (metrics) await grantEarnedTiers(service, user.id, metrics).catch(() => []);

  const input = await worldPassportInput({
    mode: 'personal', db: createPublicReadClient() as unknown as SupabaseClient, userClient: supabase as unknown as SupabaseClient,
    profile: own.profile, membership: own.membership, words: w, now: Date.now(), withExtras: true,
  });
  return { kind: 'passport', props: buildPassport(input), multiSite: (await stampCount(supabase as unknown as SupabaseClient)) > 1 };
}

export async function worldProfileMetadata(username: string): Promise<Metadata> {
  const found = await readWorldMember(createServiceRoleClient() as unknown as SupabaseClient, username, SITE_ID);
  if (!found.ok) notFound();
  const name = found.member.profile.display_name ?? found.member.profile.username;
  return { title: `${name} | ${SITE.brand.name}`, robots: { index: false, follow: false } };
}

/** /u/{username}: another member of this site, or a 404. */
export async function loadWorldProfile(username: string): Promise<PassportProps> {
  const w = words();
  const found = await readWorldMember(createServiceRoleClient() as unknown as SupabaseClient, username, SITE_ID);
  if (!found.ok) notFound();
  const { profile, membership } = found.member;
  const input = await worldPassportInput({
    mode: 'public', db: createPublicReadClient() as unknown as SupabaseClient, userClient: createPublicReadClient() as unknown as SupabaseClient,
    profile, membership, words: w, now: Date.now(), withExtras: false,
  });
  return buildPassport(input);
}
