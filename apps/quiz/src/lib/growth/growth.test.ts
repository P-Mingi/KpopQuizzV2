import { describe, expect, it } from 'vitest';

import { THEMED_MODE_IDS, staticModesFor } from '@/lib/blind-test-modes';
import { btSourceFor } from '@/lib/tracking/bt-shared';
import { comma, scoreLabel, secs } from '@/lib/ux-v1/p6/points';

import {
  LANDING_COPY, LANDING_LANGS, LANDING_PATH, LANG_NAME, LANG_SWITCH_NAME,
  landingAlternates, landingBreadcrumbJsonLd, landingDescription, landingEyebrow, landingFaq, landingFaqJsonLd, landingLead,
} from './bt-landing';
import { BT_STRINGS, BT_STRINGS_EN, localizeRunError } from './bt-strings';
import { BT_THEMES, KPDH_ID, firstSentence, isThemePage, themeById, themeCard, visibleThemes } from './bt-themes';

import type { BtLang, BtStrings } from './bt-strings';

const DASH = /[—–]/;

/** Every string a BtStrings object can print, with sample arguments. */
function allStrings(s: BtStrings): string[] {
  const out: string[] = [];
  for (const v of Object.values(s)) if (typeof v === 'string') out.push(v);
  out.push(
    s.num(4120), s.secs(1520), s.progress(3, 10, 2), s.progress(1, 10, 1), s.secondsLeft(7), s.secondsLeft(1), s.songOf(3, 10),
    s.coverAlt('Supernova', 'aespa'), s.songBy('Supernova', 'aespa'), s.nextIn(false, 3), s.nextIn(true, 3), s.speed(80),
    s.announce('correct', 180, { title: 'Supernova', artist: 'aespa' }), s.announce('timeout', 0, null), s.announce('missed', 0, null),
    s.runTitle('All K-pop'), s.resultHeading(7, 10, s.runTitle('All K-pop')), s.points(s.num(1860)),
    s.clipButton(true, 'Supernova'), s.clipButton(false, 'Supernova'), s.shareLine2(s.num(1860), 4), s.shareText(7, 10),
    ...[10, 8, 6, 4, 0].map((n) => s.scoreLabel(n, 10)),
  );
  return out;
}

describe('game strings: English is the text the v11 game printed', () => {
  const s = BT_STRINGS_EN;
  it('game bar, orb, question, reveal', () => {
    expect(s.quit).toBe('Quit blindtest');
    expect(s.progress(3, 10, 2)).toBe('Song 3 of 10, 2 right');
    expect(s.pts).toBe('pts');
    expect(s.replay).toBe('Replay the clip');
    expect(s.mute).toBe('Mute the clip');
    expect(s.tap).toBe('Tap to play the clip');
    expect(s.secondsLeft(7)).toBe('7 seconds left');
    expect(s.picking).toBe('Picking your songs');
    expect(s.songOf(3, 10)).toBe('Song 3 of 10');
    expect(`${s.songOf(3, 10)} · ${s.listening}`).toBe('Song 3 of 10 · listening');
    expect([s.tapToPlay, s.loadingClip]).toEqual(['tap to play', 'loading clip']);
    expect([s.artistRound, s.songRound, s.whoSings, s.whichSong]).toEqual(['Artist round', 'Song round', 'Who sings this?', 'Which song is this?']);
    expect([s.answers, s.yourPick, s.gettingReady]).toEqual(['Answers', 'Your pick', 'Getting your songs ready']);
    expect([s.correct, s.timeUp, s.missed]).toEqual(['Correct', 'Time is up', 'Missed']);
    expect(s.coverAlt('Supernova', 'aespa')).toBe('Supernova by aespa, cover art');
    expect(s.songBy('Supernova', 'aespa')).toBe('Supernova by aespa');
    expect(s.nextIn(false, 3)).toBe('Next song in 3 seconds');
    expect(s.nextIn(true, 3)).toBe('Results in 3 seconds');
    expect([s.seeResults, s.next]).toEqual(['See results', 'Next']);
    expect(s.speed(80)).toBe('speed +80');
  });

  it('the live region sentence is use-run.ts word for word', () => {
    expect(s.announce('correct', 180, { title: 'Supernova', artist: 'aespa' })).toBe('Correct, plus 180 points. Supernova by aespa.');
    expect(s.announce('timeout', 0, { title: 'Supernova', artist: 'aespa' })).toBe('Time is up. Supernova by aespa.');
    expect(s.announce('missed', 0, null)).toBe('Missed.');
  });

  it('results, share and challenge row', () => {
    expect(s.runTitle('All K-pop')).toBe('All K-pop blindtest');
    expect(s.resultHeading(7, 10, 'All K-pop blindtest')).toBe('7/10 on the All K-pop blindtest');
    expect(s.points(s.num(1860))).toBe('1,860 points');
    expect([s.bestCombo, s.averageAnswer, s.fastestAnswer]).toEqual(['Best combo', 'Average answer', 'Fastest answer']);
    expect([s.playAgain, s.share, s.yourSongs, s.yourSongsSub]).toEqual(['Play again', 'Share', 'Your songs', 'Play any clip again']);
    expect(s.clipButton(false, 'Supernova')).toBe('Play the Supernova clip');
    expect(s.clipButton(true, 'Supernova')).toBe('Stop the Supernova clip');
    expect(s.shareTitle).toBe('Share your blindtest');
    expect(s.shareLine2('1,860', 4)).toBe('1,860 points · best combo x4');
    expect(s.shareText(7, 10)).toBe('I scored 7/10 on the kpopquiz.org K-pop Blind Test. Can you beat me?');
    expect(s.challengeNote).toBe('They play your exact songs · 48 hours');
    expect(s.challengeRow).toBe('Challenge a friend with these exact songs');
    expect([s.copyLink, s.linkCopied, s.linkCopied48]).toEqual(['Copy link', 'Link copied', 'Link copied. It works for 48 hours.']);
    expect(s.linkReady48).toBe('Your link is ready below. It works for 48 hours.');
    expect(s.copyFailed).toBe('Copy failed. Long-press the link to copy it.');
    expect(s.linkFailed).toBe('Could not create the link. Try again.');
  });

  it('numbers, seconds and score labels are the p6 helpers', () => {
    for (const n of [0, 7, 999, 1000, 1860, 123456]) expect(s.num(n)).toBe(comma(n));
    for (const ms of [0, 900, 1520, 9999]) expect(s.secs(ms)).toBe(secs(ms));
    for (let n = 0; n <= 10; n++) expect(s.scoreLabel(n, 10)).toBe(scoreLabel(n, 10));
    expect(s.scoreLabel(0, 0)).toBe(scoreLabel(0, 0));
  });
});

describe('game strings: fr, es, id', () => {
  const langs: BtLang[] = ['fr', 'es', 'id'];
  it('each language has every string, and none is empty or left in English by mistake', () => {
    const keys = Object.keys(BT_STRINGS_EN).sort();
    for (const l of langs) {
      const s = BT_STRINGS[l];
      expect(Object.keys(s).sort()).toEqual(keys);
      expect(s.lang).toBe(l);
      for (const v of allStrings(s)) expect(v.trim().length).toBeGreaterThan(0);
      for (const k of ['quit', 'tap', 'whoSings', 'whichSong', 'playAgain', 'share', 'yourSongs', 'challengeRow', 'copyLink', 'timeUp'] as const) {
        expect(s[k], `${l}.${k}`).not.toBe(BT_STRINGS_EN[k]);
      }
    }
  });

  it('no em or en dash in any language', () => {
    for (const l of LANDING_LANGS) for (const v of allStrings(BT_STRINGS[l])) expect(DASH.test(v), v).toBe(false);
  });

  it('thousands: 4,120 / 4 120 / 4.120', () => {
    expect(BT_STRINGS.en.num(4120)).toBe('4,120');
    expect(BT_STRINGS.fr.num(4120)).toBe('4 120');
    expect(BT_STRINGS.es.num(4120)).toBe('4.120');
    expect(BT_STRINGS.id.num(4120)).toBe('4.120');
    expect(BT_STRINGS.fr.num(79)).toBe('79');
  });

  it('five score labels with the English thresholds', () => {
    for (const l of langs) {
      const labels = [10, 8, 6, 4, 0].map((n) => BT_STRINGS[l].scoreLabel(n, 10));
      expect(new Set(labels).size).toBe(5);
      expect(BT_STRINGS[l].scoreLabel(9, 10)).toBe(labels[1]);
      expect(BT_STRINGS[l].scoreLabel(7, 10)).toBe(labels[2]);
    }
  });

  it('a start error of the run hook is shown in the page language', () => {
    expect(localizeRunError(null, BT_STRINGS.fr)).toBeNull();
    expect(localizeRunError(BT_STRINGS_EN.errNotEnough, BT_STRINGS_EN)).toBe(BT_STRINGS_EN.errNotEnough);
    expect(localizeRunError('Not enough songs for this pick. Try another.', BT_STRINGS.fr)).toBe(BT_STRINGS.fr.errNotEnough);
    expect(localizeRunError('No songs found. Try another pick.', BT_STRINGS.es)).toBe(BT_STRINGS.es.errNoSongs);
    expect(localizeRunError('Could not start the game. Check your connection.', BT_STRINGS.id)).toBe(BT_STRINGS.id.errStart);
    expect(localizeRunError('Something else', BT_STRINGS.fr)).toBe('Something else');
  });
});

describe('landings', () => {
  const real = { songs: 4120, groups: 79, fansToday: 1204 };
  const none = { songs: null, groups: null, fansToday: null };

  it('four pages, the URLs and H1 of SYSTEM.md 4', () => {
    expect(LANDING_PATH).toEqual({ en: '/guess-the-kpop-song', fr: '/fr/blind-test-kpop', es: '/es/adivina-la-cancion-kpop', id: '/id/tebak-lagu-kpop' });
    expect(LANDING_LANGS.map((l) => LANDING_COPY[l].h1Text)).toEqual(['Guess the K-pop song', 'Blind test K-pop', 'Adivina la canción K-pop', 'Tebak lagu K-pop']);
    for (const l of LANDING_LANGS) {
      const c = LANDING_COPY[l];
      expect(`${c.h1.pre}${c.h1.emPre}K-pop${c.h1.emPost}`).toBe(c.h1Text);
      expect(c.path).toBe(LANDING_PATH[l]);
      expect(c.steps).toHaveLength(3);
      expect(LANG_NAME[l].length).toBeGreaterThan(0);
      expect(LANG_SWITCH_NAME[l].length).toBeGreaterThan(0);
    }
  });

  it('their own hreflang cluster, x-default English, and no /blindtest in it', () => {
    expect(landingAlternates()).toEqual({
      en: '/guess-the-kpop-song', fr: '/fr/blind-test-kpop', es: '/es/adivina-la-cancion-kpop', id: '/id/tebak-lagu-kpop', 'x-default': '/guess-the-kpop-song',
    });
  });

  it('tracking knows each path as its landing source (G1 R3)', () => {
    for (const l of LANDING_LANGS) expect(btSourceFor('free', LANDING_PATH[l])).toBe(`landing-${l}`);
  });

  it('the lead is the prototype sentence with the real counts', () => {
    expect(landingLead(LANDING_COPY.en, real)).toBe('Hear ten seconds, pick the song. 4,120 songs, 79 group playlists, free and no account needed.');
    expect(landingLead(LANDING_COPY.fr, real)).toBe('Écoute dix secondes, trouve la chanson. 4 120 chansons, 79 playlists de groupes, gratuit et sans compte.');
    expect(landingLead(LANDING_COPY.es, real)).toBe('Escucha diez segundos y elige la canción. 4.120 canciones, 79 listas de grupos, gratis y sin cuenta.');
    expect(landingLead(LANDING_COPY.id, real)).toBe('Dengarkan sepuluh detik, lalu tebak lagunya. 4.120 lagu, 79 playlist grup, gratis tanpa akun.');
  });

  it('a count that could not be read is left out, never invented', () => {
    expect(landingLead(LANDING_COPY.en, none)).toBe('Hear ten seconds, pick the song. Free and no account needed.');
    expect(landingLead(LANDING_COPY.fr, { songs: 4120, groups: null, fansToday: null })).toBe('Écoute dix secondes, trouve la chanson. Gratuit et sans compte.');
    for (const l of LANDING_LANGS) {
      expect(/\d/.test(landingLead(LANDING_COPY[l], none))).toBe(false);
      expect(landingFaq(LANDING_COPY[l], none)).toHaveLength(2);
      expect(landingFaq(LANDING_COPY[l], none).some((f) => /\d/.test(f.a))).toBe(false);
      expect(landingFaq(LANDING_COPY[l], real)).toHaveLength(3);
      expect(/\d/.test(landingDescription(LANDING_COPY[l]))).toBe(false);
    }
  });

  it('"fans playing today" only with a real count above zero', () => {
    for (const l of LANDING_LANGS) {
      expect(landingEyebrow(LANDING_COPY[l], none)).toBeNull();
      expect(landingEyebrow(LANDING_COPY[l], { ...real, fansToday: 0 })).toBeNull();
      expect(landingEyebrow(LANDING_COPY[l], { ...real, fansToday: Number.NaN })).toBeNull();
    }
    expect(landingEyebrow(LANDING_COPY.en, real)).toBe('1,204 fans playing today');
    expect(landingEyebrow(LANDING_COPY.en, { ...real, fansToday: 1 })).toBe('1 fan playing today');
    expect(landingEyebrow(LANDING_COPY.fr, real)).toBe('1 204 fans jouent aujourd’hui');
    expect(landingEyebrow(LANDING_COPY.es, real)).toBe('1.204 fans jugando hoy');
    expect(landingEyebrow(LANDING_COPY.id, real)).toBe('1.204 fans bermain hari ini');
  });

  it('FAQPage JSON-LD is the visible FAQ', () => {
    for (const l of LANDING_LANGS) {
      for (const n of [real, none]) {
        const faq = landingFaq(LANDING_COPY[l], n);
        const ld = landingFaqJsonLd(LANDING_COPY[l], n) as { '@type': string; inLanguage: string; mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> };
        expect(ld['@type']).toBe('FAQPage');
        expect(ld.inLanguage).toBe(l);
        expect(ld.mainEntity.map((q) => ({ q: q.name, a: q.acceptedAnswer.text }))).toEqual(faq);
      }
    }
  });

  it('BreadcrumbList: KpopQuiz, then the page', () => {
    const ld = landingBreadcrumbJsonLd(LANDING_COPY.es) as { itemListElement: Array<{ name: string; item: string }> };
    expect(ld.itemListElement.map((i) => [i.name, i.item])).toEqual([
      ['KpopQuiz', 'https://kpopquiz.org/'],
      ['Adivina la canción K-pop', 'https://kpopquiz.org/es/adivina-la-cancion-kpop'],
    ]);
  });

  it('no em or en dash in the landing copy', () => {
    const real2 = real;
    for (const l of LANDING_LANGS) {
      const c = LANDING_COPY[l];
      const all = [c.title, c.h1Text, landingLead(c, real2), landingDescription(c), c.start, c.live, ...c.trust, c.playlistsHeading, c.allPlaylists, c.howHeading,
        ...c.steps.flatMap((s) => [s.title, s.body]), c.faqHeading, ...landingFaq(c, real2).flatMap((f) => [f.q, f.a]), c.other, c.songsCount('300')];
      for (const v of all) expect(DASH.test(v), v).toBe(false);
    }
  });
});

describe('themes', () => {
  it('every v12 themed mode has its page copy, plus the v11 4th gen card', () => {
    expect(BT_THEMES.filter((t) => t.themed).map((t) => t.id).sort()).toEqual([...THEMED_MODE_IDS].sort());
    expect(BT_THEMES.filter((t) => !t.themed).map((t) => t.id)).toEqual(['4th-gen']);
    const v11 = new Set(staticModesFor(false).map((m) => m.id));
    expect(v11.has('4th-gen')).toBe(true);
    for (const t of BT_THEMES) if (t.themed) expect(v11.has(t.id), `${t.id} is a new URL`).toBe(false);
    expect(isThemePage('4th-gen')).toBe(false);
    expect(isThemePage(KPDH_ID)).toBe(true);
    expect(isThemePage('classic')).toBe(false);
    expect(themeById(KPDH_ID)?.h1).toBe('KPop Demon Hunters songs blind test');
  });

  it('a themed playlist is shown only when it is playable; the v11 one always', () => {
    expect(visibleThemes(new Set()).map((t) => t.id)).toEqual(['4th-gen']);
    expect(visibleThemes(new Set(['5th-gen', 'kpop-hits-2025', 'tiktok-viral', 'classic'])).map((t) => t.id)).toEqual(['5th-gen', 'tiktok-viral', 'kpop-hits-2025', '4th-gen']);
    expect(visibleThemes(new Set(THEMED_MODE_IDS)).map((t) => t.id)).toEqual(BT_THEMES.map((t) => t.id));
  });

  it('a cover count is the real count in the language, and absent without one', () => {
    const en = { num: BT_STRINGS.en.num, songsCount: LANDING_COPY.en.songsCount };
    const fr = { num: BT_STRINGS.fr.num, songsCount: LANDING_COPY.fr.songsCount };
    const gen4 = themeById('4th-gen')!;
    expect(themeCard(gen4, 'en', { '4th-gen': 1097 }, en)).toMatchObject({ href: '/blindtest/4th-gen', name: '4th gen', sub: '1,097 songs', cover: 'gen4' });
    expect(themeCard(gen4, 'fr', { '4th-gen': 1097 }, fr).sub).toBe('1 097 chansons');
    expect(themeCard(gen4, 'en', {}, en).sub).toBeUndefined();
    expect(themeCard(gen4, 'en', { '4th-gen': 0 }, en).sub).toBeUndefined();
    const kpdh = themeById(KPDH_ID)!;
    expect(themeCard(kpdh, 'en', {}, en).sub).toBe('Soundtrack songs');
    expect(themeCard(kpdh, 'fr', {}, fr)).toMatchObject({ sub: 'Chansons du film', lead: 'Les chansons du film, puis la vraie K-pop.', name: 'KPop Demon Hunters' });
  });

  it('the card sentence is the first sentence of the lead', () => {
    expect(firstSentence('One. Two.')).toBe('One.');
    expect(firstSentence('No stop')).toBe('No stop');
    expect(themeCard(themeById('tiktok-viral')!, 'en', {}, { num: String, songsCount: (n) => n }).lead).toBe('The K-pop songs everyone danced to on TikTok.');
  });

  it('no em or en dash in the theme copy', () => {
    for (const t of BT_THEMES) {
      const all = [t.name, t.h1, t.lead, t.sub.kind === 'text' ? t.sub.text : '', ...Object.values(t.loc).flatMap((l) => [l.sub ?? '', l.lead])];
      for (const v of all) expect(DASH.test(v), v).toBe(false);
    }
  });
});
