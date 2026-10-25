// Run O1, lot H2a: the class of a site on the home: it sets the three colours of its tile, pill and text (--hub-s, --hub-s-soft,
// --hub-s-ink in styles/sites/hub/h2.css). A module of its own so the client blocks do not import the server pieces.

export function siteClass(site: 'kpop' | 'anime'): string {
  return site === 'kpop' ? 'hub-h2-s-k' : 'hub-h2-s-a';
}
