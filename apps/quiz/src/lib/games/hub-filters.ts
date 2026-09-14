// Single source for the games-hub filter chips and the per-card tag map. The hub
// renders every card in server HTML (crawlable) and the client filter only toggles
// a data attribute; CSS hides the non-matching cards. Keeping the tag map here (not
// only as inline data-tag attributes) lets the filter behaviour be unit-tested and
// keeps the component and the CSS honest about which card belongs to which filter.

export const HUB_FILTERS = ['all', 'solo', 'timed', 'versus', 'vote'] as const;
export type HubFilter = (typeof HUB_FILTERS)[number];

export const HUB_FILTER_LABEL: Record<HubFilter, string> = {
  all: 'All', solo: 'Solo', timed: 'Timed', versus: 'Versus', vote: 'Vote',
};

// card test id (without the "card-" prefix) -> its space-separated data-tag value.
// This is the map the CSS `.gh-grid[data-filter="x"] .gh-card:not([data-tag~="x"])`
// rule acts on, so it must stay in lock-step with the cards in games-hub.tsx.
export const HUB_CARD_TAGS = {
  'name-them-all': 'solo timed',
  'sort-it': 'solo timed',
  'match-up': 'solo timed',
  'this-or-that': 'vote',
  'which-member': 'solo',
  'duel': 'versus',
  'tier-lists': 'solo',
  'kpop-idle': 'solo',
} as const;

export type HubCardId = keyof typeof HUB_CARD_TAGS;

// Mirrors the CSS attribute selector: "all" matches every card, otherwise the
// filter must appear as a whitespace-delimited token in the card's tag string.
export function cardMatchesFilter(tag: string, filter: HubFilter): boolean {
  if (filter === 'all') return true;
  return tag.split(/\s+/).filter(Boolean).includes(filter);
}

// The set of card ids a given filter reveals (for tests and any server logic).
export function cardsForFilter(filter: HubFilter): HubCardId[] {
  return (Object.keys(HUB_CARD_TAGS) as HubCardId[]).filter((id) => cardMatchesFilter(HUB_CARD_TAGS[id], filter));
}
