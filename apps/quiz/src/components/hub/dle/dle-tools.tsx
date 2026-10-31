'use client';

// Daily games step 4: the top bar's tools (board Reglages.dc.html): how to play, statistics, settings, the FR/EN switch, the streak, the language rule of v2 section 4. Each dialog is the
// browser's <dialog>: focus trap, Esc and the backdrop for free. Everything here is this device's: nothing leaves it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSignIn } from '@/components/ux-v1/sign-in-sheet';
import { dleCopy, gameCopy } from '@/lib/dle/copy';
import { utcDate } from '@/lib/dle/day';
import { builtGames, localePath } from '@/lib/dle/games';
import {
  DEFAULT_SETTINGS, eraseData, exportData, gameStats, gamesLeftToday, importData, languageTarget, readHistory, readSettings, universeStreak, writeSettings,
} from '@/lib/dle/local';
import { withBasePath } from '@/lib/site/base-path';
import { createBrowserClient } from '@/lib/supabase/client';

import { deviceStore } from './dle-hooks';
import { D, Flame, Ic } from './dle-icons';

import type { DleGameId } from '@/lib/dle/games';
import type { DleSettings, LangChoice, LocalHistory } from '@/lib/dle/local';
import type { DleLocale } from '@/lib/dle/types';

/** The classes the settings put on the root of a page. */
export function useDleSettings(): DleSettings {
  const [settings, setSettings] = useState<DleSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setSettings(readSettings(deviceStore()));
    const on = (): void => setSettings(readSettings(deviceStore()));
    window.addEventListener('dle:settings', on);
    return () => window.removeEventListener('dle:settings', on);
  }, []);
  return settings;
}

function applyRootClasses(s: DleSettings): void {
  const root = document.querySelector('.hub-dle-root');
  root?.classList.toggle('hub-dle-cb', s.colorblind);
  root?.classList.toggle('hub-dle-still', s.reducedMotion);
}

function saveSettings(s: DleSettings): void {
  writeSettings(deviceStore(), s);
  applyRootClasses(s);
  window.dispatchEvent(new Event('dle:settings'));
}

/** The path of this page in a locale (the page's path comes from the server, so a shared ?r= link goes to the clean address). */
const go = (enPath: string, locale: DleLocale): void => window.location.assign(withBasePath(localePath(enPath, locale)));

/** The language rule: a choice is kept; with none, a browser in French reads French. Browser only, never for a crawler's first answer. */
export function DleLanguage({ enPath, locale }: { enPath: string; locale: DleLocale }): null {
  useEffect(() => {
    const s = readSettings(deviceStore());
    applyRootClasses(s);
    const target = languageTarget(s.lang, window.navigator.language, locale);
    if (target) window.location.replace(withBasePath(localePath(enPath, target)));
  }, [enPath, locale]);
  return null;
}

export function DleLangSwitch({ enPath, locale }: { enPath: string; locale: DleLocale }): React.ReactElement {
  const t = dleCopy(locale);
  const pick = (l: DleLocale): void => {
    saveSettings({ ...readSettings(deviceStore()), lang: l });
    if (l !== locale) go(enPath, l);
  };
  return (
    <div role="group" aria-label={t.langLabel} className="hub-dle-lang">
      {(['fr', 'en'] as const).map((l) => (
        // A real link for what has no script: the equivalent page. The click also records the choice.
        <a key={l} href={withBasePath(localePath(enPath, l))} lang={l} hrefLang={l} aria-current={l === locale ? 'true' : undefined} className={l === locale ? 'hub-dle-lang-on' : ''}
          onClick={(e) => { e.preventDefault(); pick(l); }}>{l.toUpperCase()}</a>
      ))}
    </div>
  );
}

/** Sign in, or the way to the passport: read in the browser, so the pages stay static. */
export function DleAccount({ locale }: { locale: DleLocale }): React.ReactElement {
  const t = dleCopy(locale);
  const signIn = useSignIn();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let live = true;
    createBrowserClient().auth.getSession().then(({ data }) => { if (live) setSignedIn(!!data.session); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (signedIn) return <a href={withBasePath('/passport')} className="hub-dle-btn hub-dle-btn-solid">{t.passport}</a>;
  return <button type="button" aria-haspopup="dialog" className="hub-dle-btn hub-dle-btn-solid" onClick={() => signIn({ title: t.signInTitle, sub: t.signInSub })}>{t.signIn}</button>;
}

/** The number of built games still to finish today, on the tab of the Burrow. Nothing until the browser knows. */
export function DleLeftBadge({ locale }: { locale: DleLocale }): React.ReactElement | null {
  const t = dleCopy(locale);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const read = (): void => setLeft(gamesLeftToday(readHistory(deviceStore()), utcDate(new Date())));
    read();
    window.addEventListener('dle:history', read);
    return () => window.removeEventListener('dle:history', read);
  }, []);
  if (left === null || left === 0) return null;
  return <span className="hub-dle-badge hub-dle-num">{left}<span className="hub-dle-sr"> {t.left}</span></span>;
}

function useHistory(): LocalHistory {
  const [h, setH] = useState<LocalHistory>({});
  useEffect(() => {
    const read = (): void => setH(readHistory(deviceStore()));
    read();
    window.addEventListener('dle:history', read);
    return () => window.removeEventListener('dle:history', read);
  }, []);
  return h;
}

function Dialog({ id, title, closeLabel, open, onClose, children }: { id: string; title: string; closeLabel: string; open: boolean; onClose: () => void; children: React.ReactNode }): React.ReactElement {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={id} className="hub-dle-dialog" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="hub-dle-dialog-in">
        <div className="hub-dle-dialog-head">
          <h2 id={id}>{title}</h2>
          <button type="button" aria-label={closeLabel} className="hub-dle-iconbtn" onClick={onClose}><Ic d={D.x} width={2.2} /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function HowDialog({ locale, game, open, onClose }: { locale: DleLocale; game: DleGameId; open: boolean; onClose: () => void }): React.ReactElement {
  const t = dleCopy(locale);
  const w = gameCopy(game, locale);
  const rows: readonly [string, string, string?][] = [['hub-dle-t-correct', t.dlgRight, 'JYP'], ['hub-dle-t-near', t.dlgNear, '1998'], ['hub-dle-t-wrong', t.dlgWrong, 'SM']];
  return (
    <Dialog id="dle-how" title={t.dlgHow} closeLabel={t.close} open={open} onClose={onClose}>
      <ol className="hub-dle-howlist">
        {[w.dlgHow1, w.dlgHow2, w.dlgHow3].map((x, i) => <li key={i}><span aria-hidden="true" className="hub-dle-num">{i + 1}</span>{x}</li>)}
      </ol>
      <div className="hub-dle-card hub-dle-keys">
        {rows.map(([c, text, v]) => <div key={c}><span aria-hidden="true" className={`hub-dle-keytile ${c}`}>{v}</span><span>{text}</span></div>)}
        <div><span aria-hidden="true" className="hub-dle-keytile hub-dle-t-wrong hub-dle-keytile-col">2013<Ic d={D.up} size={14} width={3} /></span><span>{t.dlgArrow}</span></div>
        <div><span aria-hidden="true" className="hub-dle-keytile hub-dle-t-unknown">?</span><span>{t.dlgUnknown}</span></div>
      </div>
      <p className="hub-dle-note">{w.dlgFoot}</p>
    </Dialog>
  );
}

function StatsDialog({ locale, enPath, open, onClose }: { locale: DleLocale; enPath: string; open: boolean; onClose: () => void }): React.ReactElement {
  const t = dleCopy(locale);
  const history = useHistory();
  const games = builtGames();
  const [tab, setTab] = useState(games[0]!.id);
  const game = games.find((g) => g.id === tab) ?? games[0]!;
  const today = utcDate(new Date());
  const s = useMemo(() => gameStats(history, game.id, today), [history, game.id, today]);
  const [shared, setShared] = useState(false);
  const fmt = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 });
  const tiles: readonly [string, string][] = [
    [String(s.plays), t.sPlays], [String(s.wins), t.sWins], [s.average === null ? '-' : fmt.format(s.average), t.sAvg],
    [String(s.firstTry), t.sFirst], [String(s.streak), t.sStreak], [String(s.bestStreak), t.sBest],
  ];
  const max = Math.max(1, ...s.histogram);
  const aria = t.sHistAria(s.histogram.map((w, i) => (w ? t.sHistItem(w, i + 1) : '')).filter(Boolean).join(', '));
  const share = async (): Promise<void> => {
    const text = t.sShareText(game.brand, game.guess[locale], s.wins, s.plays, s.bestStreak, `${window.location.origin}${localePath(enPath, locale)}`);
    try { await navigator.clipboard.writeText(text); setShared(true); window.setTimeout(() => setShared(false), 1600); } catch { /* no clipboard: nothing to say */ }
  };
  return (
    <Dialog id="dle-stats" title={t.dlgStats} closeLabel={t.close} open={open} onClose={onClose}>
      {games.length > 1 ? (
        <div role="tablist" aria-label={t.dlgStats} className="hub-dle-statstabs">
          {games.map((g) => <button key={g.id} type="button" role="tab" aria-selected={g.id === game.id} onClick={() => setTab(g.id)}>{g.guess[locale]}</button>)}
        </div>
      ) : null}
      {s.plays === 0 ? <p className="hub-dle-note">{t.sNone}</p> : null}
      <div className="hub-dle-stattiles">
        {tiles.map(([v, l]) => <div key={l} className="hub-dle-card"><span className="hub-dle-num hub-dle-statv">{v}</span><span className="hub-dle-statl">{l}</span></div>)}
      </div>
      <div className="hub-dle-hist">
        <span className="hub-dle-hist-h">{t.sHist}</span>
        <div role="img" aria-label={aria}>
          {s.histogram.map((w, i) => (
            <div key={i} className="hub-dle-histrow">
              <span className="hub-dle-num">{i === s.histogram.length - 1 ? `${i + 1}+` : i + 1}</span>
              <span className={`hub-dle-histbar${w ? ' hub-dle-histbar-on' : ''}`} style={{ width: `${12 + (w / max) * 88}%` }}><span className="hub-dle-num">{w}</span></span>
            </div>
          ))}
        </div>
      </div>
      <div><button type="button" className="hub-dle-btn hub-dle-btn-solid" disabled={s.plays === 0} onClick={() => void share()}>{shared ? t.copied : t.sShare}</button></div>
      <p className="hub-dle-note">{t.sNote}</p>
    </Dialog>
  );
}

function SettingsDialog({ locale, enPath, open, onClose }: { locale: DleLocale; enPath: string; open: boolean; onClose: () => void }): React.ReactElement {
  const t = dleCopy(locale);
  const settings = useDleSettings();
  const [paste, setPaste] = useState('');
  const [note, setNote] = useState('');
  const langs: readonly [LangChoice, string, string][] = [['auto', t.auto, t.autoHelp], ['fr', t.french, t.frenchHelp], ['en', t.english, t.englishHelp]];
  const setLang = (lang: LangChoice): void => {
    saveSettings({ ...settings, lang });
    const target = languageTarget(lang, window.navigator.language, locale);
    if (target) go(enPath, target);
  };
  const toggle = (key: 'colorblind' | 'reducedMotion'): void => saveSettings({ ...settings, [key]: !settings[key] });
  return (
    <Dialog id="dle-settings" title={t.dlgSettings} closeLabel={t.close} open={open} onClose={onClose}>
      <fieldset className="hub-dle-field">
        <legend>{t.gameLang}</legend>
        {langs.map(([id, label, help]) => (
          <label key={id} className={`hub-dle-opt${settings.lang === id ? ' hub-dle-opt-on' : ''}`}>
            <input type="radio" name="dle-lang" checked={settings.lang === id} onChange={() => setLang(id)} />
            <span><strong>{label}</strong><small>{help}</small></span>
          </label>
        ))}
      </fieldset>
      <div className="hub-dle-field">
        <span className="hub-dle-field-h">{t.display}</span>
        <label className="hub-dle-opt hub-dle-opt-switch">
          <span><strong>{t.colorblind}</strong><small>{t.colorblindHelp}</small></span>
          <input type="checkbox" role="switch" checked={settings.colorblind} onChange={() => toggle('colorblind')} />
        </label>
        <div aria-hidden="true" className="hub-dle-cbdemo">
          <span className="hub-dle-keytile hub-dle-t-correct">JYP</span><span className="hub-dle-keytile hub-dle-t-near">1998</span><span className="hub-dle-keytile hub-dle-t-wrong">SM</span>
        </div>
        <label className="hub-dle-opt hub-dle-opt-switch">
          <span><strong>{t.reduced}</strong><small>{t.reducedHelp}</small></span>
          <input type="checkbox" role="switch" checked={settings.reducedMotion} onChange={() => toggle('reducedMotion')} />
        </label>
      </div>
      <details className="hub-dle-transfer">
        <summary>{t.transfer}</summary>
        <p className="hub-dle-note">{t.transferHelp}</p>
        <button type="button" className="hub-dle-btn hub-dle-btn-line" onClick={() => { void navigator.clipboard?.writeText(exportData(deviceStore())).then(() => setNote(t.copied)).catch(() => setNote(exportData(deviceStore()))); }}>{t.transferCopy}</button>
        <textarea aria-label={t.transfer} rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} />
        <button type="button" className="hub-dle-btn hub-dle-btn-line" disabled={!paste.trim()} onClick={() => {
          const ok = importData(deviceStore(), paste);
          setNote(ok ? t.transferDone : t.transferBad);
          if (ok) { setPaste(''); window.dispatchEvent(new Event('dle:history')); }
        }}>{t.transferApply}</button>
      </details>
      <div className="hub-dle-dialog-foot">
        <button type="button" className="hub-dle-erase" onClick={() => {
          eraseData(deviceStore());
          saveSettings(DEFAULT_SETTINGS);
          window.dispatchEvent(new Event('dle:history'));
          setNote(t.eraseDone);
        }}>{t.erase}</button>
        <span role="status" className="hub-dle-note">{note}</span>
      </div>
    </Dialog>
  );
}

type Open = 'how' | 'stats' | 'settings' | null;

/** The three buttons and the streak of the game's bar. The streak appears only when this device counted one. */
export function DleGameTools({ locale, enPath, game, universeGames }: { locale: DleLocale; enPath: string; game: DleGameId; universeGames: readonly DleGameId[] }): React.ReactElement {
  const t = dleCopy(locale);
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const history = useHistory();
  const streak = universeStreak(history, universeGames, utcDate(new Date()));
  const buttons: readonly [Exclude<Open, null>, string, string][] = [['how', t.help, D.help], ['stats', t.stats, D.stats], ['settings', t.settings, D.sliders]];
  return (
    <>
      {streak > 0 ? <span className="hub-dle-streak"><Flame className="hub-dle-flame" /><span className="hub-dle-num">{streak}</span> {t.streakDays(streak).replace(/^\d+ /, '')}<span className="hub-dle-sr"> {t.streakSr}</span></span> : null}
      {buttons.map(([id, label, d]) => (
        <button key={id} type="button" aria-haspopup="dialog" aria-label={label} className="hub-dle-iconbtn" onClick={() => setOpen(id)}><Ic d={d} size={20} width={1.9} /></button>
      ))}
      <HowDialog locale={locale} game={game} open={open === 'how'} onClose={close} />
      <StatsDialog locale={locale} enPath={enPath} open={open === 'stats'} onClose={close} />
      <SettingsDialog locale={locale} enPath={enPath} open={open === 'settings'} onClose={close} />
    </>
  );
}
