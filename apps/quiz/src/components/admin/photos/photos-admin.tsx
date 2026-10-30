'use client';

// Daily games step 2 (RAPPORT-JEUX-DU-JOUR-v2.md 7.3): the Photos tab of the admin of bunnyverse.org/anime, the validated board
// docs/strategy/o1/dle/prototype/Admin.dc.html: tabs Idols, Groupes, Agences, Personnages anime, Séries anime, Bannières et images,
// Icônes du jeu, Stickers; the photo tabs filter "Sans photo", "Licence à préciser", "Toutes". Everything it shows comes from the database
// (lib/photos/admin-data.ts, read on the server behind the admin gate); a table that is not there yet is said so, never drawn with rows.
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ICON_SLOTS, IMAGE_SLOTS, TABS } from '@/lib/photos/slots';

import { BannersPanel } from './banners-panel';
import { IconsPanel } from './icons-panel';
import { PhotoDrawer } from './photo-drawer';
import { StickersPanel } from './stickers-panel';
import { PHOTO_ICON, Svg, liveVersion } from './ui';
import s from './photos-admin.module.css';

import type { AdminRow, PhotosAdminData } from '@/lib/photos/admin-data';
import type { PhotoFilter, PhotoKind, TabId } from '@/lib/photos/slots';

type PhotoTab = Exclude<TabId, 'banners' | 'icons' | 'stickers'>;

const PAGE = 50;

const TITLE: Readonly<Record<'photos' | 'banners' | 'icons' | 'stickers', string>> = {
  photos: 'Photos à compléter', banners: 'Bannières et images', icons: 'Icônes du jeu', stickers: 'Stickers',
};
const INTRO: Readonly<Record<'photos' | 'banners' | 'icons' | 'stickers', string>> = {
  photos: 'Chaque photo garde sa source, son auteur et sa licence. Elle s\'affiche dans les suggestions, les lignes d\'essais et l\'écran de résultat, jamais comme indice de jeu.',
  banners: 'Choisis l\'image en haut de chaque page de jeu. Elle passe en WebP aux bonnes tailles toute seule, avec ton crédit affiché en bas à droite.',
  icons: 'Chaque icône des jeux du jour se change ici : une icône de la bibliothèque ou ton propre PNG, avec ou sans cercle. Les trois états (en cours, fait, à venir) se mettent à jour tout seuls.',
  stickers: 'Décore les espaces vides des pages avec tes PNG : côté, position, taille, rotation, miroir et opacité. Aperçu en direct à gauche.',
};
const GROUP_COL: Readonly<Record<PhotoTab, string>> = { idols: 'Groupe', groups: 'Agence', labels: 'Groupes liés', chars: 'Série', series: 'Personnages' };
const NOUN: Readonly<Record<PhotoTab, [string, string]>> = {
  idols: ['idol', 'idols'], groups: ['groupe', 'groupes'], labels: ['agence', 'agences'], chars: ['personnage', 'personnages'], series: ['série', 'séries'],
};
const FILTERS: readonly [PhotoFilter, string][] = [['none', 'Sans photo'], ['tocheck', 'Licence à préciser'], ['all', 'Toutes']];

const norm = (v: string): string => v.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Which filter a record falls in: no picture at all, a picture with no verified licence, or a verified one. */
export function pictureState(r: AdminRow): 'none' | 'tocheck' | 'ok' {
  if (r.image?.verified) return 'ok';
  if (r.image || r.legacy) return 'tocheck';
  return 'none';
}

/** The flag of the board's "Fiche" column. */
export function flagOf(r: AdminRow): { text: string; review: boolean } {
  const st = pictureState(r);
  if (st === 'ok') return { text: 'Licence vérifiée', review: false };
  if (st === 'tocheck') return { text: 'Licence à préciser', review: true };
  if (r.review) return { text: 'À relire', review: true };
  if (r.kind === 'agency' && r.fresh) return { text: 'Nouvelle fiche', review: false };
  return { text: 'Sans photo', review: false };
}

export function filterRows(rows: readonly AdminRow[], filter: PhotoFilter, query: string): AdminRow[] {
  const q = norm(query.trim());
  return rows.filter((r) => (filter === 'all' || pictureState(r) === filter) && (!q || norm(r.name).includes(q) || norm(r.context).includes(q)));
}

/** The honest sentence of a tab whose table is missing, or of a save that must wait for a migration; null when it works. */
export function blockedOf(tab: TabId, data: PhotosAdminData): string | null {
  const { schema } = data;
  if (tab === 'banners' || tab === 'icons' || tab === 'stickers') {
    return schema.siteAssets ? null : 'La table site_assets arrive avec la migration 022 (docs/pending-migrations/multisite/022-photos-admin.sql) : l\'aperçu marche, l\'enregistrement attend son application.';
  }
  if (schema.entityImages === 'missing') return 'La table entity_images arrive avec la migration 018 : l\'enregistrement attend son application.';
  if (schema.entityImages !== '022') {
    return 'L\'enregistrement attend les migrations 019 et 022 (colonnes « licence vérifiée » et vignette de 96 px, types idol, group et agency).';
  }
  return null;
}

export interface AdminNavItem { readonly label: string; readonly href: string; readonly current: boolean }

export function PhotosAdmin({ data, nav, initialTab, now, logo, emptyArt }: {
  data: PhotosAdminData; nav: readonly AdminNavItem[]; initialTab: TabId; now: number; logo: string; emptyArt: string;
}): React.ReactElement {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [filter, setFilter] = useState<PhotoFilter>('none');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [sel, setSel] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isPhotos = tab !== 'banners' && tab !== 'icons' && tab !== 'stickers';
  const photoTab = (isPhotos ? tab : 'idols') as PhotoTab;
  const all = data.rows[photoTab];
  const rows = useMemo(() => filterRows(all, filter, query), [all, filter, query]);
  const selected = rows.find((r) => `${r.kind}|${r.slug}|${r.name}` === sel) ?? rows[0] ?? null;
  const kind = (TABS.find((t) => t.id === photoTab)?.kind ?? 'idol') as PhotoKind;
  const blocked = blockedOf(tab, data);
  const agencyBlocked = photoTab === 'labels' && !data.schema.agencies ? 'La table des agences arrive avec la migration 022 : ces noms sont ceux que les groupes citent aujourd\'hui, l\'enregistrement attend la table.' : null;

  const counts: Record<TabId, number> = {
    idols: data.rows.idols.filter((r) => pictureState(r) === 'none').length,
    groups: data.rows.groups.filter((r) => pictureState(r) === 'none').length,
    labels: data.rows.labels.filter((r) => pictureState(r) === 'none').length,
    chars: data.rows.chars.filter((r) => pictureState(r) === 'none').length,
    series: data.rows.series.filter((r) => pictureState(r) === 'none').length,
    banners: IMAGE_SLOTS.length, icons: ICON_SLOTS.length, stickers: 0,
  };
  const stickerKeys = new Set(data.assets.filter((a) => a.type === 'sticker').map((a) => a.key));
  counts.stickers = [...stickerKeys].filter((k) => liveVersion(data.assets, k, now)?.url).length;

  const pick = (t: TabId): void => { setTab(t); setSel(null); setShown(PAGE); setMessage(null); };
  const saved = (m: string): void => { setMessage(m); router.refresh(); };
  const mode = isPhotos ? 'photos' : (tab as 'banners' | 'icons' | 'stickers');

  const head = (
    <>
      <div className={s.titleBox}>
        <h1 id="ph" className={s.title}>{TITLE[mode]}</h1>
        <p className={s.intro}>{INTRO[mode]}</p>
      </div>
      <div role="tablist" aria-label="Type de fiche" className={s.tabs}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === tab} className={s.tab} onClick={() => pick(t.id)}>
            {t.label} <span className={`${s.num} ${s.count}`}>{counts[t.id]}</span>
          </button>
        ))}
      </div>
      {message ? <p className={s.status} role="status">{message}</p> : null}
    </>
  );

  const animeMissing = (photoTab === 'chars' || photoTab === 'series') && !data.schema.anime;
  const emptyText = animeMissing
    ? photoTab === 'chars' ? 'Les personnages arrivent avec la migration 011. Ils apparaîtront ici, sans photo au départ.' : 'Les séries arrivent avec la migration 011.'
    : all.length === 0 ? 'Aucune fiche dans la base pour ce type.' : 'Aucune fiche ne correspond à ce filtre.';
  const [one, many] = NOUN[photoTab];
  const filterWords = filter === 'none' ? 'sans photo' : filter === 'tocheck' ? 'avec une licence à préciser' : '';
  const visible = rows.slice(0, shown);
  const footer = `${visible.length} sur ${rows.length} ${rows.length === 1 ? one : many}${filterWords ? ` ${filterWords}` : ''}.${photoTab === 'idols' && filter === 'none' && rows.length > 0 && rows.every((r) => r.review) ? ' Toutes ces fiches sont aussi à relire.' : ''}`;

  return (
    <div className={s.root}>
      <header className={s.header}>
        <div className={s.headerIn}>
          {/* eslint-disable-next-line @next/next/no-img-element -- our mascot, 32 px */}
          <span className={s.brand}><img src={logo} alt="" width={32} height={32} /><span className={s.brandName}>Admin</span></span>
          <nav aria-label="Admin" className={s.nav}>
            {nav.map((n) => <a key={n.href} href={n.href} className={s.navLink} aria-current={n.current ? 'page' : undefined}>{n.label}</a>)}
          </nav>
        </div>
      </header>
      <main className={s.main}>
        {tab === 'banners' ? <BannersPanel head={head} assets={data.assets} now={now} blocked={blocked} onSaved={saved} />
          : tab === 'icons' ? <IconsPanel head={head} assets={data.assets} now={now} blocked={blocked} onSaved={saved} />
          : tab === 'stickers' ? <StickersPanel head={head} assets={data.assets} now={now} blocked={blocked} onSaved={saved} />
          : (
            <>
              <section aria-labelledby="ph" className={s.section}>
                {head}
                <div className={s.filters}>
                  <div className={s.filterGroup} role="group" aria-label="Filtre">
                    {FILTERS.map(([f, label]) => <button key={f} type="button" className={s.pill} aria-pressed={filter === f} onClick={() => { setFilter(f); setShown(PAGE); setSel(null); }}>{label}</button>)}
                  </div>
                  <label htmlFor="q" className={s.sr}>Rechercher</label>
                  <input id="q" type="search" className={s.search} placeholder="Rechercher un nom ou un groupe" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} />
                </div>
                {visible.length > 0 ? (
                  <>
                    <div className={s.tableBox}>
                      <table className={s.table}>
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: 64 }}>Photo</th>
                            <th scope="col">Nom</th>
                            <th scope="col">{GROUP_COL[photoTab]}</th>
                            <th scope="col">Fiche</th>
                            <th scope="col"><span className={s.sr}>Action</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((r) => {
                            const f = flagOf(r);
                            const id = `${r.kind}|${r.slug}|${r.name}`;
                            const thumb = r.image?.thumbUrl ?? r.image?.url ?? r.legacy?.url ?? null;
                            return (
                              <tr key={id} className={`${s.row} ${selected && id === `${selected.kind}|${selected.slug}|${selected.name}` ? s.rowOn : ''}`}>
                                <td>
                                  {/* eslint-disable-next-line @next/next/no-img-element -- the stored 96 px file or the site's own picture */}
                                  {thumb ? <img src={thumb} alt="" width={44} height={44} className={s.phImg} loading="lazy" />
                                    : <span aria-hidden="true" className={s.ph}><Svg d={PHOTO_ICON} size={18} width={2} /></span>}
                                </td>
                                <td className={s.cellName}>{r.name}</td>
                                <td className={s.cellCtx}>{r.context || (photoTab === 'groups' ? 'non renseignée' : '')}</td>
                                <td><span className={f.review ? s.flagReview : s.flagOk}>{f.text}</span></td>
                                <td style={{ textAlign: 'right' }}>
                                  <button type="button" className={s.outline} onClick={() => { setSel(id); setMessage(null); }}>{r.image ? 'Modifier' : 'Ajouter une photo'}</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <span className={s.footer}>{footer}</span>
                    {rows.length > visible.length ? <button type="button" className={`${s.outline} ${s.more}`} onClick={() => setShown(shown + PAGE)}>Voir {Math.min(PAGE, rows.length - visible.length)} de plus</button> : null}
                  </>
                ) : (
                  <div className={s.empty}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- our mascot */}
                    <img src={emptyArt} alt="" width={48} height={48} />
                    <span>{emptyText}</span>
                  </div>
                )}
              </section>
              {!animeMissing ? (
                <PhotoDrawer row={selected} kind={kind} blocked={agencyBlocked ?? blocked} onSaved={saved}
                  onSkip={() => { const i = selected ? rows.indexOf(selected) : -1; const next = rows[i + 1]; if (next) setSel(`${next.kind}|${next.slug}|${next.name}`); }} />
              ) : null}
            </>
          )}
      </main>
    </div>
  );
}
