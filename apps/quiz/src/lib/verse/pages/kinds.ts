// V-PAGES core - niche-agnostic kind machinery (the V3 law: agnostic core +
// per-verse config). A KIND defines what a custom page of that type carries: a
// typed mini-infobox (fact fields demand a per-field source), a suggested section
// scaffold, and badge/gate rules. The K-pop kind set lives in kpop-kinds.ts; a
// future verse (anime, gaming) ships its own config with zero core change.

export type InfoboxFieldType = 'text' | 'number' | 'year' | 'date' | 'url' | 'select';

export interface InfoboxFieldDef {
  key: string;
  label: string;
  type: InfoboxFieldType;
  /** A verifiable claim: stored as { value, source }; the source is REQUIRED
   * whenever the value is present (the sources-on-facts law). */
  fact?: boolean;
  /** url fields: official destinations only. https is enforced structurally;
   * domain judgment rides review + patrol (no allowlist can enumerate every
   * official store, so the gate is honest about what it can prove). */
  officialOnly?: boolean;
  options?: string[];
  help?: string;
}

export interface PageSectionDef { key: string; label: string; help?: string }

export interface PageKindDef {
  kind: string;
  label: string;
  /** Honest picker copy: what this kind is FOR, no overselling. */
  description: string;
  infobox: InfoboxFieldDef[];
  /** Scaffold suggestions. The body is ONE TipTap doc on the verse_content
   * rails; the creator seeds these as headings, V-TEXT folds them. */
  sections: PageSectionDef[];
  /** Fan-content kind: renders the "fan-written" badge, demands no external
   * sources (owner gate 3). Moderation still applies everywhere. */
  fanWritten?: boolean;
  /** Ranked kind: the methodology field must be filled before the page can
   * leave draft (the Palworld lesson: no methodology, no publish). */
  requiresMethodology?: boolean;
  /** Expected to reference living persons. NOTE: the exclusions below are
   * enforced on EVERY kind regardless; this flag records expectation for
   * UI/copy, it never relaxes enforcement. */
  idolCapable?: boolean;
}

// ---------------------------------------------------------------------------
// LIVING-PERSONS STRUCTURAL EXCLUSIONS (core law). Applied at validation to
// titles, slugs and every infobox string value of EVERY kind; prose bodies run
// through the banned-terms patrol (moderation.checkText) at save on top. The
// list is topic-level, mirroring the universe doc: dating/relationships,
// health, family privacy, residence, rumors.
// ---------------------------------------------------------------------------

export const LIVING_PERSONS_EXCLUSIONS: RegExp[] = [
  /\bdating\b/i, /\bboyfriend\b/i, /\bgirlfriend\b/i, /\brelationships?\b/i,
  /\bhealth\b/i, /\bdiagnos\w*/i, /\bhospitali[sz]\w*/i, /\bsurgery\b/i,
  /\bfamily\b/i, /\bparents?\b/i, /\bhome address\b/i, /\bresidence\b/i,
  /\bwhere (?:he|she|they) live/i, /\brumou?rs?\b/i, /\bscandals?\b/i,
];

/** Returns the first excluded-topic match in the text, or null when clean. */
export function violatesLivingPersons(text: string): string | null {
  for (const re of LIVING_PERSONS_EXCLUSIONS) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Registry mechanics
// ---------------------------------------------------------------------------

export interface KindRegistry {
  kinds: Record<string, PageKindDef>;
  /** Kinds available on a space with NO explicit enablement config. Templates
   * (step 7) persist presentation.enabledKinds to widen or narrow this. */
  defaultEnabled: string[];
}

export function buildRegistry(defs: PageKindDef[], defaultEnabled: string[]): KindRegistry {
  const kinds: Record<string, PageKindDef> = {};
  for (const d of defs) kinds[d.kind] = d;
  for (const k of defaultEnabled) if (!kinds[k]) throw new Error(`defaultEnabled kind "${k}" is not registered`);
  return { kinds, defaultEnabled };
}

export function getKind(reg: KindRegistry, kind: string): PageKindDef | null {
  return reg.kinds[kind] ?? null;
}

/** The kinds a given space offers in its creator UI. enabledKinds comes from
 * presentation config (template bundles write it); absent -> the default set.
 * Unregistered ids in config are ignored (config cannot invent kinds). */
export function kindsForSpace(reg: KindRegistry, enabledKinds?: string[] | null): PageKindDef[] {
  const ids = (enabledKinds && enabledKinds.length > 0 ? enabledKinds : reg.defaultEnabled)
    .filter((k) => !!reg.kinds[k]);
  return [...new Set(ids)].map((k) => reg.kinds[k]!);
}
