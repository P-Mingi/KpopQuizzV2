// The optional slots of the group hub (hub.tsx). A site that is not kpop fills them from its own page (rule 18: one
// hub component, a prop for each difference); with none given the hub renders exactly today's kpop page. Types only.

import type { ReactNode } from 'react';

/** One section of the quizzes list when it is grouped (a series: one section per arc, spoiler-free first). */
export interface HubQuizSection {
  readonly ord: number;
  readonly title: string;
  readonly slugs: readonly string[];
}

/** What a quiz card of a grouped list needs to say "Safe for you" or "Covers <arc>" in the browser. */
export interface HubQuizLevel {
  readonly arc: number;
  readonly scope: 'anime' | 'manga' | 'both' | null;
  readonly arcName: string;
}

/** The grouping of HubQuizzes (A2): sections, the level of every quiz, the words, and whose progress to read. */
export interface HubQuizGrouping {
  readonly seriesSlug: string;
  readonly groupId: number;
  readonly sections: readonly HubQuizSection[];
  readonly levels: Readonly<Record<string, HubQuizLevel>>;
  /** `covers` holds the placeholder {arc}; `heading` replaces the section title ("<group> quizzes"). */
  readonly labels: { readonly heading: string; readonly safe: string; readonly covers: string };
}

export interface HubFaqSlot {
  readonly q: string;
  readonly a: string;
  readonly text: string;
}

export interface HubRelatedSlot {
  readonly slug: string;
  readonly name: string;
  readonly quizzes: number;
  /** Replaces the group avatar of the row (a typographic title card). */
  readonly art: ReactNode;
}

export interface HubSlots {
  /** Site origin and brand name for the JSON-LD (no trailing slash). */
  readonly origin: string;
  readonly brand: string;
  readonly crumb: { readonly href: string; readonly label: string };
  readonly eyebrow: string;
  /** The H1 text; the tail is the second line (null: none). Default: "<name> Quiz" and "Test How Well You Know <name>". */
  readonly h1?: { readonly main: string; readonly tail: string | null } | undefined;
  readonly intro: string;
  readonly startLabel?: string | undefined;
  /** In the photo column of the hero (a title card). */
  readonly heroArt?: ReactNode;
  /** Replaces the facts line under the hero actions. */
  readonly heroFacts?: ReactNode;
  /** The blind test door, or none. */
  readonly blindtest: { readonly href: string } | null;
  readonly triviaAvailable: boolean;
  /** Above the quizzes list. */
  readonly beforeQuizzes?: ReactNode;
  readonly grouping?: HubQuizGrouping | undefined;
  /** First in the main column of the lower band. */
  readonly main?: ReactNode;
  readonly faqs: readonly HubFaqSlot[];
  readonly related: readonly HubRelatedSlot[];
  readonly labels: {
    readonly faq: string;
    readonly community: string;
    readonly communityAll: string;
    readonly related: string;
  };
}
