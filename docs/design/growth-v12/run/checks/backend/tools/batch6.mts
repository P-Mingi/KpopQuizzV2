// C2 batch 6: H01 to H06, S01, S03 (group hub, share kit API). Evidence: ../batch6-evidence.txt
import { BASE, get, hrefs, write } from './c2-browser.mts';
import { countQ, rows } from './c2-read.mjs';

const out: string[] = [`C2 batch 6 at ${new Date().toISOString()} on ${BASE}`, ''];
const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const group = async (slug: string) => {
  const r = await rows(`groups?select=id,name,fandom_name&slug=eq.${slug}`);
  return Array.isArray(r.body) ? r.body[0] : null;
};

// H01: ways to play on a group with every mode (stray-kids)
for (const slug of ['stray-kids', 'bts']) {
  const r = await get(`/${slug}-quiz`);
  const h = hrefs(r.text);
  const want = ['#hub-quizzes', `/blindtest/group-${slug}`, `/${slug}-name-all-members`, `/which-${slug}-member-are-you`];
  const live = h.filter((x) => x.startsWith('/live'));
  out.push(`H01 /${slug}-quiz ${r.status}: ${want.map((w) => `${w}=${h.includes(w)}`).join(' ')} live=${live[0] ?? 'none'}`);
  for (const w of [...want.slice(1), ...live.slice(0, 1)]) if (h.includes(w) || live.includes(w)) out.push(`H01   ${w} -> ${(await get(w)).status}`);
  out.push(`H02 /${slug}-quiz Fans picked section in HTML: ${/id="fans-picked"/.test(r.text)}`);
}
for (const g of ['bts', 'aespa', 'blackpink']) {
  const r = await fetch(`${BASE}/api/duel/fans-picked?group=${g}`);
  const j: any = await r.json();
  out.push(`H02 GET /api/duel/fans-picked?group=${g} -> ${r.status} ranked=${j.ranked} votes=${j.votes} songs=${j.songs?.length} updatedAt=${j.updatedAt}`);
}

// H04, H05: empty hub (riize)
{
  const r = await get('/riize-quiz');
  const h = hrefs(r.text);
  const create = [...new Set(h.filter((x) => x.startsWith('/create?group=riize')))];
  out.push(`H04 /riize-quiz ${r.status}: create links ${create.join(' | ')}`);
  for (const c of create) out.push(`H04   ${c} -> ${(await get(c)).status}`);
  const g = await group('riize');
  const songs = await countQ(`songs?select=id&group_id=eq.${g?.id}&status=eq.active`);
  const quizzes = await countQ(`quizzes?select=id&group_id=eq.${g?.id}&status=eq.published`);
  const t = text(r.text);
  const m = /(\d[\d,]*) songs?/i.exec(t.slice(t.indexOf('Be the first') - 400 > 0 ? t.indexOf('Be the first') - 400 : 0));
  out.push(`H05 SQL riize: published quizzes ${quizzes.count}, active songs ${songs.count}; served "No RIIZE quiz yet"=${/No RIIZE quiz yet/i.test(t)}; first song figure near the empty block: ${m?.[0] ?? 'none'}; "plays" on the group blindtest line: ${/blindtest[^.]{0,60}play/i.test(t)}`);
}

// H06: thin hub (katseye)
{
  const g = await group('katseye');
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const plays = await countQ(`plays?select=id,quizzes!inner(group_id,status)&quizzes.group_id=eq.${g?.id}&quizzes.status=eq.published&created_at=gt.${encodeURIComponent(since)}`);
  const quizzes = await countQ(`quizzes?select=id&group_id=eq.${g?.id}&status=eq.published`);
  const r = await get('/katseye-quiz');
  const t = text(r.text);
  out.push(`H06 SQL katseye: published quizzes ${quizzes.count}; plays in 60 days ${plays.count} (http ${plays.status}); fandom ${g?.fandom_name}`);
  out.push(`H06 served: "${/Only \d+ KATSEYE quiz[^.]*\./.exec(t)?.[0] ?? 'no nudge'}" "${/Fans played them [\d,]+ times[^.]*\./.exec(t)?.[0] ?? 'no count'}"`);
}

// S01: share kit API
const q = await rows('quizzes?select=id&status=eq.published&limit=1');
const realId = Array.isArray(q.body) && q.body[0] ? q.body[0].id : 'none';
for (const [label, id] of [['bad id', 'x'], ['unknown uuid', '00000000-0000-4000-8000-0000000000c2'], ['real quiz, signed out', realId]]) {
  const r = await fetch(`${BASE}/api/creators/kit?quiz=${encodeURIComponent(id)}`);
  const body = await r.text();
  out.push(`S01 GET /api/creators/kit (${label}) -> ${r.status} ${label.startsWith('real') ? body.replace(/"(captions|title)":"[^"]*"/g, '"$1":"..."').slice(0, 300) : body}`);
}
write('batch6-evidence.txt', out);
console.log(out.join('\n'));
