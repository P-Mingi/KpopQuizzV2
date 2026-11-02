// Daily games step 2 (RAPPORT-JEUX-DU-JOUR-v2.md 7.1): /credits on bunnyverse.org, every licensed photo the site shows, with its author, its
// licence and a link to the page it comes from. The same credit system as OtakuQuiz's /credits (components/anime/credits-page.tsx): the
// licence words and links of lib/anime/entity-images-rules.ts, "Photo: <author>, <licence>", a character above the spoiler floor listed
// without its name or its picture. Only what the public views of 022 give: a picture whose licence is not verified is never here.
// CR-021 (owner decision of 2026-11-02): the page lists the pictures that need a credit (CC BY, CC BY-SA) and no other, and the page that calls it
// answers a 404 while there are none; no credit is printed on a page or in a game, this page is the only place. kpopquiz.org uses the same
// component for its idols and groups (app/(site)/credits/page.tsx) with its own class prefix and words.
// Server component, no hooks; React escapes every stored value at this sink and every link is an absolute https address (public-read.ts).
import { UxPage } from '@/components/ux-v1/page';
import { LICENSE_LABEL, LICENSE_URL } from '@/lib/anime/entity-images-rules';
import { REGISTRY } from '@/lib/site/registry';

import type { DleLocale } from '@/lib/dle/types';
import type { LiveAsset, PublicPicture } from '@/lib/photos/public-read';
import type { ImageLicense } from '@/lib/photos/slots';

/** The words of the page in the two languages: /credits, and /fr/credits since daily games step 4 (it opens with the Burrow). */
const WORDS: Readonly<Record<DleLocale, {
  readonly title: string; readonly lede: string; readonly empty: string; readonly photo: string; readonly source: string; readonly character: (series: string) => string;
  readonly sections: Readonly<Record<'idols' | 'groups' | 'agencies' | 'series' | 'characters' | 'images', string>>;
  readonly slots: Readonly<Record<string, string>>;
}>> = {
  en: {
    title: 'Photo credits',
    lede: 'Some photos on Bunnyverse are shared under a Creative Commons licence that asks for a credit. Each one is listed here with its author, its licence and a link to the page it comes from. Small pictures, like the thumbnails of the daily games, are credited on this page only.',
    empty: 'No licensed photo is shown on Bunnyverse yet. Until one is, the daily games show initials and every image keeps the colours of its site.',
    photo: 'Photo:', source: 'Source page', character: (s) => `A character of ${s}`,
    sections: { idols: 'Idols', groups: 'Groups', agencies: 'Agencies', series: 'Anime series', characters: 'Anime characters', images: 'Banners and images of the site' },
    slots: {},
  },
  fr: {
    title: 'Crédits photos',
    lede: 'Certaines photos de Bunnyverse sont sous une licence Creative Commons qui demande un crédit. Chacune est listée ici avec son auteur, sa licence et un lien vers sa page d\u2019origine. Les petites images, comme les vignettes des jeux du jour, sont créditées sur cette page seulement.',
    empty: 'Aucune photo sous licence n\u2019est encore affichée sur Bunnyverse. En attendant, les jeux du jour montrent les initiales et chaque image garde les couleurs de son site.',
    photo: 'Photo :', source: 'Page source', character: (s) => `Un personnage de ${s}`,
    sections: { idols: 'Idols', groups: 'Groupes', agencies: 'Agences', series: 'Séries anime', characters: 'Personnages d\u2019anime', images: 'Bannières et images du site' },
    slots: {
      'banner:kpopdle': 'Bannière de Kpopdle', 'banner:otakudle': 'Bannière d\u2019Otakudle', 'banner:daily': 'Bannière du Terrier', 'banner:otakudle/one-piece': 'Bannière d\u2019Otakudle One Piece',
      'home:kpopdle': 'Carte Kpopdle', 'home:otakudle': 'Carte Otakudle',
      'home:qotd-k': 'Quiz K-pop du jour, page d\u2019accueil', 'home:qotd-a': 'Quiz anime du jour, page d\u2019accueil', 'home:debate': 'Débat du jour, page d\u2019accueil',
      'home:cross-1': 'Crossover, première vignette', 'home:cross-2': 'Crossover, deuxième vignette', 'home:cross-3': 'Crossover, troisième vignette',
      'daily:mode-idol': 'Mode Idol du jour', 'daily:mode-group': 'Mode Groupe du jour', 'daily:mode-song': 'Mode Chanson du jour', 'daily:mode-hidden': 'Mode Membres cachés',
      'daily:mode-char': 'Mode Personnage du jour', 'daily:mode-series': 'Mode Série du jour', 'daily:mode-byseries': 'Mode Un Otakudle par série',
    },
  },
};

export const CREDITS_TITLE = WORDS.en.title;
export const CREDITS_DESCRIPTION = 'Every licensed photo shown on Bunnyverse, with its author, its licence and a link to its source page: idols, groups, anime series and game banners.';

/** One line of the page. */
export interface CreditItem {
  /** The record it credits (data-key), or null for a locked character: nothing on its line may name it. */
  readonly key: string | null;
  readonly name: string;
  /** The 96 px file, or null (a locked character, a banner credited by its slot name). */
  readonly thumb: string | null;
  readonly position: string;
  readonly author: string;
  readonly sourceUrl: string | null;
  readonly license: ImageLicense;
  /** The exact licence page (Commons gives it, with the version); else the page of the licence's family (lib/anime/entity-images-rules.ts). */
  readonly licenseUrl?: string | null;
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
  'daily:mode-idol': 'Idol of the day mode', 'daily:mode-group': 'Group of the day mode', 'daily:mode-song': 'Song of the day mode', 'daily:mode-hidden': 'Hidden members mode',
  'daily:mode-char': 'Character of the day mode', 'daily:mode-series': 'Series of the day mode', 'daily:mode-byseries': 'One Otakudle per series mode',
};

const byName = (a: CreditItem, b: CreditItem): number => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

/** Letters and digits only, lower case: 'File:Monkey_D._Luffy.jpg' and 'monkey-d-luffy' compare as 'filemonkeydluffyjpg' and 'monkeydluffy'. */
const squash = (v: string): string => {
  let t = v;
  try { t = decodeURIComponent(v); } catch { /* a malformed escape: compare the raw text */ }
  return t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');
};

/**
 * True when `text` may name the character of `characterSlug` ('<series>/<character>'): it holds the whole character slug, or one of its
 * words of three letters or more (a source page is often named after the character: File:Luffy_cosplay.jpg). Fail closed: a false match
 * only drops a link or a note, never the author and the licence.
 */
export function namesCharacter(text: string | null, characterSlug: string): boolean {
  if (!text) return false;
  const own = characterSlug.split('/')[1] ?? '';
  const hay = squash(text);
  if (own && hay.includes(squash(own))) return true;
  return own.split('-').some((w) => w.length >= 3 && hay.includes(squash(w)));
}

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
  locale: DleLocale = 'en',
): CreditSection[] {
  const copy = WORDS[locale];
  const words = (slug: string): string => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const line = (p: PublicPicture & { readonly license: ImageLicense }, name: string, locked = false): CreditItem => {
    const note = p.licenseNote && p.licenseNote.trim() ? p.licenseNote.trim() : null;
    // A locked character keeps its credit (author and licence), never its slug, picture or name. Its source page is linked only when the
    // address does not name it; otherwise the line prints the author and the licence without the link (and a note that names it goes).
    if (locked) {
      return {
        key: null, name, thumb: null, position: p.position, author: p.author ?? '', sourceUrl: namesCharacter(p.sourceUrl, p.slug) ? null : p.sourceUrl,
        license: p.license, licenseUrl: p.licenseUrl ?? null, note: namesCharacter(note, p.slug) ? null : note,
      };
    }
    return { key: `${p.kind}:${p.slug}`, name, thumb: p.thumb, position: p.position, author: p.author ?? '', sourceUrl: p.sourceUrl, license: p.license, licenseUrl: p.licenseUrl ?? null, note };
  };
  // CR-021: the page lists the pictures that need a credit (CC BY, CC BY-SA) and no other; the view gives no credit for the rest.
  const credited = pictures.filter((p): p is PublicPicture & { readonly license: ImageLicense } => p.needsCredit !== false && p.license !== null);
  const of = (kind: string): (PublicPicture & { readonly license: ImageLicense })[] => credited.filter((p) => p.kind === kind);
  const named = (kind: string): CreditItem[] => of(kind).filter((p) => p.name).map((p) => line(p, p.name!)).sort(byName);
  const characters = of('character').map((p) => {
    const seriesSlug = p.slug.split('/')[0] ?? '';
    const series = seriesNames[seriesSlug] ?? words(seriesSlug);
    const own = characterNames[p.slug];
    return own ? line(p, `${own} (${series})`) : line(p, copy.character(series), true);
  }).sort(byName);
  const images: CreditItem[] = assets
    .filter((a) => (a.type === 'banner' || a.type === 'card_image') && a.needsCredit !== false && a.large && a.license && a.author && SLOT_NAMES[a.key])
    .map((a) => ({
      key: a.key, name: copy.slots[a.key] ?? SLOT_NAMES[a.key]!, thumb: a.thumb, position: '50% 50%', author: a.author!, sourceUrl: a.sourceUrl,
      license: a.license!, note: a.licenseNote && a.licenseNote.trim() ? a.licenseNote.trim() : null,
    }));
  return [
    { id: 'idols', title: copy.sections.idols, items: named('idol') },
    { id: 'groups', title: copy.sections.groups, items: named('group') },
    { id: 'agencies', title: copy.sections.agencies, items: named('agency') },
    { id: 'series', title: copy.sections.series, items: named('series') },
    { id: 'characters', title: copy.sections.characters, items: characters },
    { id: 'images', title: copy.sections.images, items: images },
  ].filter((s) => s.items.length > 0);
}

function Credit({ item, locale, prefix }: { item: CreditItem; locale: DleLocale; prefix: string }): React.ReactElement {
  const label = LICENSE_LABEL[item.license];
  const licenseUrl = item.licenseUrl ?? LICENSE_URL[item.license];
  return (
    <li className={`${prefix}-item`} data-key={item.key ?? undefined}>
      {item.thumb ? (
        // A plain img: the 96 px file made at upload (no Vercel image optimisation). Decorative: the name is printed beside it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumb} alt="" width={48} height={48} loading="lazy" decoding="async" className={`${prefix}-thumb`} style={{ objectPosition: item.position }} />
      ) : null}
      <div className={`${prefix}-text`}>
        <h3 className={`${prefix}-name`}>{item.name}</h3>
        <p>
          {WORDS[locale].photo} {item.sourceUrl ? <a href={item.sourceUrl} rel="noopener noreferrer nofollow" target="_blank">{item.author}</a> : item.author},{' '}
          {licenseUrl ? <a href={licenseUrl} rel="noopener noreferrer" target="_blank">{label}</a> : label}
        </p>
        {item.note ? <p className={`${prefix}-meta`}>{item.note}</p> : null}
        {item.sourceUrl ? <p className={`${prefix}-meta`}><a href={item.sourceUrl} rel="noopener noreferrer nofollow" target="_blank">{WORDS[locale].source}</a></p> : null}
      </div>
    </li>
  );
}

/** The class prefix of the hub's page (styles/sites/hub/credits.css); kpopquiz.org passes its own (styles/kpop/credits.css) and its own words. */
export function HubCreditsPage({ sections, locale = 'en', prefix = 'hub-credits', words }: {
  sections: readonly CreditSection[]; locale?: DleLocale; prefix?: string; words?: { readonly title: string; readonly lede: string };
}): React.ReactElement {
  const copy = { ...WORDS[locale], ...words };
  return (
    <UxPage width="text" className={prefix}>
      <h1 className="ux-h1">{copy.title}</h1>
      <p className={`${prefix}-lede`}>{copy.lede}</p>
      {sections.length === 0 ? (
        <p className={`${prefix}-empty`} data-testid="credits-empty">{copy.empty}</p>
      ) : sections.map((s) => (
        <section key={s.id} className={`${prefix}-section`} aria-labelledby={`cr-${s.id}`}>
          <h2 id={`cr-${s.id}`} className={`${prefix}-h2`}>{s.title}</h2>
          <ul className={`${prefix}-list`}>
            {/* Keyed by position: a key from the record would print a locked character's slug into the page's data. */}
            {s.items.map((i, n) => <Credit key={n} item={i} locale={locale} prefix={prefix} />)}
          </ul>
        </section>
      ))}
    </UxPage>
  );
}
