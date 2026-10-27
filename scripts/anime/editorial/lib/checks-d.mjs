// Run O1, lane E1a: checks C10 (allowed sources), C11 (no dash), C12 (no emoji), C13 (title against inspiration
// titles) and C14 (no image field, no artwork).

import { BANNED_HOSTS, SOURCE_HOSTS } from './thresholds.mjs';
import { DASH_RE, EMOJI_RE, diceTrigrams, hostIs, hostOf, looksLikeUrl, normalize, walkKeys, walkStrings, words } from './text.mjs';
import { voiceProblems } from '../../k1/personality-data.mjs';
import { Result, citedFacts, factsOfItem, isObj, questionsOf } from './checks-base.mjs';

/** What a checker scans: the item's data, with a facts file reduced to its clean facts (no source excerpts). */
export function viewOf(item) {
  if (item.kind === 'facts') { const nf = factsOfItem(item); return { slug: nf.slug, facts: nf.facts.map((x) => x.fact) }; }
  return item.data;
}

const BANNED_RE = /myanimelist|jikan\.moe|fandom\.com|animethemes\.moe|kprofiles|anilist\.co|sporcle/i;
const URL_KEYS = new Set(['url', 'source_url', 'official_url']);
const www = (h) => h.replace(/^www\./, '');

export function c10(item, ctx) {
  const r = new Result('C10');
  const view = viewOf(item);
  const wikiHosts = Object.values(SOURCE_HOSTS).flat();
  const official = [...ctx.officialHosts].filter(Boolean).map(www);
  const allowed = (host) => wikiHosts.some((d) => hostIs(host, d)) || official.some((o) => hostIs(www(host), o));
  walkStrings(view, (s, path, key) => {
    if (BANNED_RE.test(s) && !looksLikeUrl(s)) r.fail(path, 'names a banned source (MyAnimeList, Jikan, Fandom, AnimeThemes, kprofiles, AniList, Sporcle)');
    if (!(looksLikeUrl(s) || URL_KEYS.has(key))) return;
    const host = hostOf(s);
    if (!/^https:\/\//i.test(s)) { r.fail(path, `the link ${s} is not https`); return; }
    if (BANNED_HOSTS.some((b) => hostIs(host, b))) { r.fail(path, `${host} is a banned source`); return; }
    const inFactSource = /^\/facts\/[0-9]+\/sources\/[0-9]+\/url$/.test(path);
    if (!inFactSource && !allowed(host)) r.fail(path, `${host} is not Wikipedia, Wikidata, MusicBrainz, Oricon, Anime News Network or an official site cited by the facts`);
  });
  if (item.kind === 'quiz' || item.kind === 'daily') {
    const urls = new Set((Array.isArray(item.data?.sources) ? item.data.sources : []).map((s) => s?.url));
    const used = new Set();
    questionsOf(item).forEach((q, i) => {
      if (typeof q?.source_url !== 'string') return;
      used.add(q.source_url);
      if (!urls.has(q.source_url)) r.fail(`/questions/${i}/source_url`, 'the question source is not one of the quiz sources');
      const cited = citedFacts(q, ctx).found;
      if (cited.length > 0 && !cited.some((h) => (h.fact.sources ?? []).some((s) => s.url === q.source_url))) r.warn(`/questions/${i}/source_url`, 'the question source is none of the pages its cited facts were read from');
    });
    for (const u of urls) if (typeof u === 'string' && !used.has(u)) r.warn('/sources', `the source ${u} is cited by no question`);
  }
  return r;
}

export function c11(item) {
  const r = new Result('C11');
  walkStrings(viewOf(item), (s, path) => { if (!looksLikeUrl(s) && DASH_RE.test(s)) r.fail(path, 'contains an en dash, an em dash or a double hyphen'); });
  return r;
}

export function c12(item, ctx) {
  const r = new Result('C12');
  walkStrings(viewOf(item), (s, path) => { if (EMOJI_RE.test(s)) r.fail(path, 'contains an emoji'); });
  // Lane PERS, the voice of a personality quiz: a profile speaks to the reader ("You ..."), never about the character.
  if (item.kind === 'personality' && Array.isArray(item.data?.profiles)) {
    voiceProblems(item.data, ctx?.series?.get(item.data.group_slug)?.data).forEach((f) => r.fail(f.path, f.message));
  }
  return r;
}

const FILLER = new Set(['quiz', 'test', 'trivia', 'the', 'a', 'an', 'ultimate', 'how', 'well', 'do', 'you', 'know', 'guess', 'can', 'about', 'anime', 'your']);
const core = (t) => words(t).filter((w) => !FILLER.has(w)).join(' ');

export function c13(item, ctx) {
  const r = new Result('C13');
  if (item.kind !== 'quiz' && item.kind !== 'daily') return r.notApplicable();
  const title = item.data?.title;
  if (typeof title !== 'string') return r;
  const full = normalize(title); const c = core(title);
  for (const insp of ctx.inspiration) {
    const nf = normalize(insp); const nc = core(insp);
    const score = Math.max(diceTrigrams(full, nf), c && nc ? diceTrigrams(c, nc) : 0, c && c === nc ? 1 : 0);
    if (score >= ctx.thresholds.c13_title_dice) { r.fail('/title', `too close to the inspiration title ${JSON.stringify(insp)} (score ${score.toFixed(2)}, fail from ${ctx.thresholds.c13_title_dice})`); break; }
  }
  if (ctx.inspiration.length === 0) r.warn('', 'no inspiration titles loaded: the title was compared with nothing');
  return r;
}

const IMAGE_WORDS = new Set(['image', 'images', 'img', 'imgs', 'photo', 'photos', 'picture', 'pictures', 'artwork', 'artworks', 'cover', 'covers', 'poster', 'posters', 'thumbnail', 'thumbnails', 'thumb', 'banner', 'avatar', 'screenshot', 'screenshots', 'wallpaper', 'illustration', 'fanart', 'sprite']);
const safeDecode = (p) => { try { return decodeURIComponent(p); } catch { return p; } };
const IMAGE_URL_RE = /\.(?:png|jpe?g|gif|webp|avif|bmp|svg|tiff?|ico)(?:[?#]|$)/i;

export function c14(item) {
  const r = new Result('C14');
  const view = viewOf(item);
  walkKeys(view, (key, path) => {
    const parts = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (parts.some((p) => IMAGE_WORDS.has(p))) r.fail(path, `the key ${key} is an image field: no image, no artwork`);
  });
  walkStrings(view, (s, path, key) => {
    if (/^data:image\//i.test(s)) r.fail(path, 'an embedded image');
    else if (looksLikeUrl(s)) {
      const u = (() => { try { return new URL(s); } catch { return null; } })();
      if (u && (IMAGE_URL_RE.test(u.pathname) || /(?:^|[/:])(?:File|Image|Special:FilePath)[:/]/i.test(safeDecode(u.pathname)) || /(?:^|\.)upload\.wikimedia\.org$/.test(u.hostname))) r.fail(path, 'a link to an image file');
    }
  });
  if (isObj(view) && view.quiz_type === 'image') r.fail('/quiz_type', 'an image quiz: anime quizzes have no image type');
  return r;
}
