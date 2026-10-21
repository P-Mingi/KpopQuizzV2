// Run O1, lot (b), lane P1: the words the shared kpop passport components say on a world site (rule 18: the components
// take them as an optional prop, or read them from the registry here, and say today's literals when the prop is absent).
// Each builder answers undefined for kpop, so a kpop render never meets a word of this file. Plain data only (no
// function): server components pass it to client components.

import { siteConfig } from '@/lib/site/registry';

import { p1, p1Template } from './copy';
import { fmt } from './fmt';

import type { SiteId, PickIcon } from '@/lib/site/types';

/** What the passport view model and the passport components say (UxPassport, PassportActions, the guest passport). */
export interface PassportWords {
  readonly tagIcon: PickIcon;
  /** "since {year}" after the main series, "Watching since {year}" on its own. */
  readonly since: string;
  readonly watchingSince: string;
  readonly also: string;
  readonly joined: string;
  readonly followerOne: string;
  readonly followerOther: string;
  readonly xpTo: string;
  readonly streak: string;
  readonly made: string;
  readonly plays: string;
  readonly seriesMasteredStat: string;
  readonly seriesMasteredTitle: string;
  readonly mastered: string;
  readonly masteredPct: string;
  readonly follow: string;
  readonly following: string;
  readonly shareOwn: string;
  readonly shareOther: string;
  readonly teamChip: string;
  readonly teamLine: string;
  readonly teamTitle: string;
  readonly guestTitle: string;
  readonly guestLead: string;
  /** The fan card (a kpop image route) is not offered. */
  readonly storyCard: false;
}

export function passportWords(site: SiteId): PassportWords | undefined {
  if (site === 'kpop') return undefined;
  return {
    tagIcon: siteConfig(site).vocabulary.favourites.pickIcon,
    since: p1Template('u.since', site),
    watchingSince: p1Template('u.watchingSince', site),
    also: p1Template('u.also', site),
    joined: p1Template('u.joined', site),
    followerOne: p1Template('u.followers.one', site),
    followerOther: p1Template('u.followers.other', site),
    xpTo: p1Template('u.xpTo', site),
    streak: p1Template('u.streak', site),
    made: p1Template('u.made', site),
    plays: p1Template('u.plays', site),
    seriesMasteredStat: p1Template('u.statSeriesMastered', site),
    seriesMasteredTitle: p1Template('u.seriesMastered', site),
    mastered: p1Template('u.mastered', site),
    masteredPct: p1Template('u.masteredPct', site),
    follow: p1Template('u.follow', site),
    following: p1Template('u.following', site),
    shareOwn: p1Template('u.shareOwn', site),
    shareOther: p1Template('u.shareOther', site),
    teamChip: p1Template('team.chip', site),
    teamLine: p1Template('team.profileLine', site),
    teamTitle: p1Template('team.title', site),
    guestTitle: p1Template('u.guestTitle', site),
    guestLead: p1Template('u.guestLead', site),
    storyCard: false,
  };
}

/** What the sign-in sheet and the login page say. */
export interface SignInWords {
  readonly title: string;
  readonly saveScore: string;
  readonly body: string;
  readonly google: string;
  readonly emailDivider: string;
  readonly emailPlaceholder: string;
  readonly emailLabel: string;
  readonly emailCta: string;
  readonly sending: string;
  /** "Link sent to {email}. ..." */
  readonly sent: string;
  readonly network: string;
  readonly privacy: string;
  readonly welcome: string;
  readonly loginLead: string;
  readonly guest: string;
  readonly headline: string;
  readonly sub: string;
  readonly stats: readonly (readonly [string, string])[];
  /** The path the email link lands on (registry auth.emailLanding). */
  readonly emailLanding: string;
  readonly brand: string;
}

export function signInWords(site: SiteId): SignInWords | undefined {
  if (site === 'kpop') return undefined;
  return {
    title: p1('signin.title', {}, site),
    saveScore: p1('signin.saveScore', {}, site),
    body: p1('signin.body', {}, site),
    google: p1('signin.google', {}, site),
    emailDivider: p1('signin.emailDivider', {}, site),
    emailPlaceholder: p1('signin.emailPlaceholder', {}, site),
    emailLabel: p1('signin.emailLabel', {}, site),
    emailCta: p1('signin.emailCta', {}, site),
    sending: p1('signin.sending', {}, site),
    sent: p1Template('signin.sent', site),
    network: p1('signin.network', {}, site),
    privacy: p1('signin.privacy', {}, site),
    welcome: p1('signin.heading', {}, site),
    loginLead: p1('signin.loginLead', {}, site),
    guest: p1('signin.guest', {}, site),
    headline: p1('signin.headline', {}, site),
    sub: p1('signin.sub', {}, site),
    stats: [
      [p1('signin.statA', {}, site), p1('signin.statALabel', {}, site)],
      [p1('signin.statB', {}, site), p1('signin.statBLabel', {}, site)],
      [p1('signin.statC', {}, site), p1('signin.statCLabel', {}, site)],
    ],
    emailLanding: siteConfig(site).auth.emailLanding,
    brand: siteConfig(site).brand.name,
  };
}

/** What the username page says. */
export interface OnboardingWords {
  readonly title: string;
  readonly hint: string;
  readonly taken: string;
  readonly placeholder: string;
  readonly rules: string;
  readonly cta: string;
}

export function onboardingWords(site: SiteId): OnboardingWords | undefined {
  if (site === 'kpop') return undefined;
  return {
    title: p1('onboarding.usernameTitle', {}, site),
    hint: p1('onboarding.usernameHint', {}, site),
    taken: p1('onboarding.usernameTaken', {}, site),
    placeholder: p1('onboarding.usernamePlaceholder', {}, site),
    rules: p1('onboarding.usernameRules', {}, site),
    cta: p1('onboarding.usernameCta', {}, site),
  };
}

export { fmt };
