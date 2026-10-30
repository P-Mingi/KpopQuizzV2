// Daily games step 2 (RAPPORT-JEUX-DU-JOUR-v2.md 7.1): /credits on bunnyverse.org, every licensed photo the site shows, with its author, its
// licence and a link to the page it comes from. The same credit system as OtakuQuiz's /credits (components/anime/credits-page.tsx): the
// licence words and links of lib/anime/entity-images-rules.ts, "Photo: <author>, <licence>", a character above the spoiler floor listed
// without its name or its picture. Only what the public views of 022 give: a picture whose licence is not verified is never here.
// Server component, no hooks; React escapes every stored value at this sink and every link is an absolute https address (public-read.ts).
import { UxPage } from '@/components/ux-v1/page';
import { LICENSE_LABEL, LICENSE_URL } from '@/lib/anime/entity-images-rules';
import { REGISTRY } from '@/lib/site/registry';

import type { LiveAsset, PublicPicture } from '@/lib/photos/public-read';
import type { ImageLicense } from '@/lib/photos/slots';

export const CREDITS_TITLE = 'Photo credits';
export const CREDITS_DESCRIPTION = 'Every licensed photo shown on Bunnyverse, with its author, its licence and a link to its source page: idols, groups, anime series and game banners.';

/** One line of the page. */
export interface CreditItem {
  readonly key: string;
  readonly name: string;
  /** The 96 px file, or null (a locked character, a banner credited by its slot name). */
  readonly thumb: string | null;
  readonly position: string;
  readonly author: string;
  readonly sourceUrl: string | null;
  readonly license: ImageLicense;
  readonly note: string | null;
}

export interface CreditSection { readonly id: string; readonly title: string; readonly items: readonly CreditItem[] }

/** The English name of each image slot of site_assets (the admin names them in French). */
const SLOT_NAMES: Readonly<Record<string, string>> = {
  'banner:kpopdle': 'Kpopdle banner',
  'banner:otakudle': 'Otakudle banner',
  'banner:daily': 'The Burrow banner',
  'banner:otakudle/one-piece': 'Otakudle One Piece banner',
  'home:kpopdle': 'Kpopdle card',
  'home:otakudle': 'Otakudle card',
  'home:site-k': `${REGISTRY.kpop.brand.name} card, home page`,
  'home:site-a': `${REGISTRY.anime.brand.name} card, home page`,
  'home:qotd-k': 'K-pop quiz of the day, home page',
  'home:qotd-a': 'Anime quiz of the day, home page',
  'home:debate': 'Debate of the day, home page',
  'home:cross-1': 'Crossover, first tile',
  'home:cross-2': 'Crossover, second tile',
  'home:cross-3': 'Crossover, third tile',
};

const byName = (a: CreditItem, b: CreditItem): number => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

/**
 * The sections of the page, in the order of the games: idols, groups, agencies, series, characters, then the banners and images of the pages.
 * `characterNames` holds the names OtakuQuiz prints (published characters with no spoiler); a character it does not name is locked.
 * A section with no line is left out.
 */
export function creditSections(
  pictures: readonly PublicPicture[],
  assets: readonly LiveAsset[],
  characterNames: Readonly<Record<string, string>>,
  seriesNames: Readonly<Record<string, string>>,
): CreditSection[] {
  const words = (slug: string): string => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const line = (p: PublicPicture, name: string, locked = false): CreditItem => ({
    key: `${p.kind}:${p.slug}`, name, thumb: locked ? null : p.thumb, position: p.position, author: p.author, sourceUrl: p.sourceUrl,
    license: p.license, note: p.licenseNote && p.licenseNote.trim() ? p.licenseNote.trim() : null,
  });
  const of = (kind: string): PublicPicture[] => pictures.filter((p) => p.kind === kind);
  const named = (kind: string): CreditItem[] => of(kind).filter((p) => p.name).map((p) => line(p, p.name!)).sort(byName);
  const characters = of('character').map((p) => {
    const seriesSlug = p.slug.split('/')[0] ?? '';
    const series = seriesNames[seriesSlug] ?? words(seriesSlug);
    const own = characterNames[p.slug];
    return own ? line(p, `${own} (${series})`) : line(p, `A character of ${series}`, true);
  }).sort(byName);
  const images: CreditItem[] = assets
    .filter((a) => (a.type === 'banner' || a.type === 'card_image') && a.large && a.license && a.author && SLOT_NAMES[a.key])
    .map((a) => ({
      key: a.key, name: SLOT_NAMES[a.key]!, thumb: a.thumb, position: '50% 50%', author: a.author!, sourceUrl: a.sourceUrl,
      license: a.license!, note: a.licenseNote && a.licenseNote.trim() ? a.licenseNote.trim() : null,
    }));
  return [
    { id: 'idols', title: 'Idols', items: named('idol') },
    { id: 'groups', title: 'Groups', items: named('group') },
    { id: 'agencies', title: 'Agencies', items: named('agency') },
    { id: 'series', title: 'Anime series', items: named('series') },
    { id: 'characters', title: 'Anime characters', items: characters },
    { id: 'images', title: 'Banners and images of the site', items: images },
  ].filter((s) => s.items.length > 0);
}

function Credit({ item }: { item: CreditItem }): React.ReactElement {
  const label = LICENSE_LABEL[item.license];
  const licenseUrl = LICENSE_URL[item.license];
  return (
    <li className="hub-credits-item" data-key={item.key}>
      {item.thumb ? (
        // A plain img: the 96 px file made at upload (no Vercel image optimisation). Decorative: the name is printed beside it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumb} alt="" width={48} height={48} loading="lazy" decoding="async" className="hub-credits-thumb" style={{ objectPosition: item.position }} />
      ) : null}
      <div className="hub-credits-text">
        <h3 className="hub-credits-name">{item.name}</h3>
        <p>
          Photo: {item.sourceUrl ? <a href={item.sourceUrl} rel="noopener noreferrer nofollow" target="_blank">{item.author}</a> : item.author},{' '}
          {licenseUrl ? <a href={licenseUrl} rel="noopener noreferrer" target="_blank">{label}</a> : label}
        </p>
        {item.note ? <p className="hub-credits-meta">{item.note}</p> : null}
        {item.sourceUrl ? <p className="hub-credits-meta"><a href={item.sourceUrl} rel="noopener noreferrer nofollow" target="_blank">Source page</a></p> : null}
      </div>
    </li>
  );
}

export function HubCreditsPage({ sections }: { sections: readonly CreditSection[] }): React.ReactElement {
  return (
    <UxPage width="text" className="hub-credits">
      <h1 className="ux-h1">{CREDITS_TITLE}</h1>
      <p className="hub-credits-lede">
        Bunnyverse shows only licensed photos: Creative Commons with credit, public domain, our own photos, or photos used with written
        permission. Every one is listed here with its author, its licence and a link to the page it comes from. Small pictures, like the
        thumbnails of the daily games, are credited on this page only.
      </p>
      {sections.length === 0 ? (
        <p className="hub-credits-empty" data-testid="credits-empty">
          No licensed photo is shown on Bunnyverse yet. Until one is, the daily games show initials and every image keeps the colours of its site.
        </p>
      ) : sections.map((s) => (
        <section key={s.id} className="hub-credits-section" aria-labelledby={`cr-${s.id}`}>
          <h2 id={`cr-${s.id}`} className="hub-credits-h2">{s.title}</h2>
          <ul className="hub-credits-list">
            {s.items.map((i) => <Credit key={i.key} item={i} />)}
          </ul>
        </section>
      ))}
    </UxPage>
  );
}
