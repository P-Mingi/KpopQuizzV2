// Workstream P, step 2: seed the personality quiz bank into prod.
// Source of truth: docs/p-question-archetype-bank.md (FINAL, owner-approved).
// The 10 questions are hand-encoded here (their weight syntax in the bank is
// irregular, e.g. Q4a "heart:5-then-soft (heart:3, chaos:2)"); member axis
// tables + trait lines are PARSED from the bank so there is no transcription
// drift. Member photos are resolved from the name_all_members games.
//
// Idempotent: clears personality_questions + personality_profiles, then inserts.
// Run: node scripts/seed-personality.mjs [--dry]   (--dry parses + reports, no writes)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const DRY = process.argv.includes('--dry');
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ---- the 10 shared questions (faithful to the bank, incl. 0-weights; Q4a's
//      parenthetical is the resolved value; Q1a care:5 kept as-written [FLAG]) ----
const QUESTIONS = [
  { ord: 1, question: 'Your role in the friend group?', options: [
    { text: 'The one who plans everything', weights: { care: 5, energy: 3 } },
    { text: 'The chaos that makes it fun', weights: { chaos: 5, energy: 5 } },
    { text: 'The quiet one who roasts everyone once an hour', weights: { heart: 5, energy: 0, spotlight: 5 } },
    { text: 'The baby everyone protects (and underestimates)', weights: { care: 5, chaos: 3 } },
  ] },
  { ord: 2, question: 'It is 2am on tour. Where are you?', options: [
    { text: 'Asleep hours ago, self-care is discipline', weights: { chaos: 0, care: 3 } },
    { text: 'In the studio, one more take', weights: { craft: 5, spotlight: 5 } },
    { text: 'Feral hotel-hallway content with the members', weights: { chaos: 5, energy: 5 } },
    { text: 'Baking, gaming, quietly recharging alone', weights: { heart: 0, energy: 0 } },
  ] },
  { ord: 3, question: 'Someone in the group is having a rough day. You:', options: [
    { text: 'Notice first, talk to them one-on-one', weights: { care: 0, heart: 0 } },
    { text: 'Make them laugh until they forget', weights: { energy: 5, chaos: 4 } },
    { text: 'Say nothing, sit next to them, share food', weights: { spotlight: 5, heart: 2 } },
    { text: 'Write them into your next lyric', weights: { craft: 5 } },
  ] },
  { ord: 4, question: 'First impression people get of you?', options: [
    { text: 'Intimidating, then it collapses in 5 minutes', weights: { heart: 3, chaos: 2 } },
    { text: 'Sunshine, immediately', weights: { energy: 5, heart: 0 } },
    { text: 'Mysterious main-character energy', weights: { spotlight: 0, energy: 2 } },
    { text: 'Polite and quiet (they have no idea yet)', weights: { energy: 0, chaos: 2 } },
  ] },
  { ord: 5, question: 'Pick a stage moment:', options: [
    { text: 'The killing part everyone screenshots', weights: { spotlight: 0, craft: 0 } },
    { text: 'The ad-lib nobody expected', weights: { chaos: 5, craft: 2 } },
    { text: 'The perfectly clean formation you drilled', weights: { care: 3, craft: 0, chaos: 0 } },
    { text: 'The self-produced track finally performed live', weights: { craft: 5 } },
  ] },
  { ord: 6, question: 'Group project (school edition). You are:', options: [
    { text: 'The leader who actually emails the teacher', weights: { care: 0, energy: 2 } },
    { text: 'The one who does it all at 3am and aces it', weights: { craft: 4, chaos: 3 } },
    { text: 'The morale officer contributing memes and one slide', weights: { chaos: 5, energy: 4 } },
    { text: 'The one who quietly fixes everyone else’s slides', weights: { spotlight: 5, care: 0 } },
  ] },
  { ord: 7, question: 'Your comfort activity?', options: [
    { text: 'Gym, physical, body busy means mind quiet', weights: { heart: 4, craft: 0 } },
    { text: 'Cooking or baking for people', weights: { heart: 0, care: 0 } },
    { text: 'Games, anime, one specific hyperfixation', weights: { energy: 0, chaos: 2 } },
    { text: 'Journaling, photos, making something', weights: { craft: 5, spotlight: 4 } },
  ] },
  { ord: 8, question: 'How do you argue?', options: [
    { text: 'Calm words, devastating accuracy', weights: { heart: 5, energy: 0 } },
    { text: 'I do not argue, I go quiet (scarier)', weights: { spotlight: 5, heart: 3 } },
    { text: 'Loud for 90 seconds then buying you food', weights: { energy: 5, heart: 0 } },
    { text: 'I win by making you laugh mid-sentence', weights: { chaos: 5 } },
  ] },
  { ord: 9, question: 'Pick a vibe (trust your first click):', options: [
    { text: 'Gold hour, film camera, quiet street', weights: { spotlight: 5, craft: 3 } },
    { text: 'Neon, 1am, convenience store run', weights: { chaos: 4, energy: 4 } },
    { text: 'Home, blankets, someone else cooked', weights: { care: 5, heart: 0 } },
    { text: 'Stage lights, ears ringing, alive', weights: { spotlight: 0, energy: 5 } },
  ] },
  { ord: 10, question: 'What do people thank you for most?', options: [
    { text: 'Being the reason it got done', weights: { care: 0, craft: 2 } },
    { text: 'Being the reason it was fun', weights: { chaos: 5, energy: 4 } },
    { text: 'Being the one who listened', weights: { heart: 0, spotlight: 3 } },
    { text: 'Being unapologetically yourself first', weights: { spotlight: 0, heart: 2 } },
  ] },
];

// ---- parse the bank: group tables (6 axes) + trait lines ----
const AXES = ['energy', 'chaos', 'care', 'craft', 'heart', 'spotlight'];
const bank = readFileSync('../../docs/p-question-archetype-bank.md', 'utf8');
const sections = bank.split(/^## Group \d+ - /m).slice(1);
const groupsFromBank = sections.map((sec) => {
  const nameLine = sec.split('\n')[0].trim(); // "Stray Kids (8)"
  const groupName = nameLine.replace(/\s*\(\d+\)\s*$/, '').trim();
  const members = [];
  for (const line of sec.split('\n')) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
    if (!m) continue;
    if (m[1].trim().toLowerCase() === 'member') continue; // header row
    const [, name, ...nums] = m;
    const axes = {}; AXES.forEach((a, i) => { axes[a] = Number(nums[i]); });
    members.push({ name: name.trim(), axes, trait_lines: [] });
  }
  // trait lines: "- Name: "l1" / "l2" / "l3""
  for (const line of sec.split('\n')) {
    const t = line.match(/^-\s*([^:]+?):\s*(.+)$/);
    if (!t) continue;
    const nm = t[1].trim();
    const target = members.find((x) => x.name === nm);
    if (!target) continue;
    target.trait_lines = t[2].split(' / ').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
  }
  return { groupName, members };
});

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// bank group name -> candidate matchers against the groups table
const GROUP_ALIAS = {
  'TXT': ['txt', 'tomorrow x together', 'tomorrow-x-together'],
  '(G)I-DLE': ['gidle', 'g-i-dle', '(g)i-dle', 'g)i-dle', 'i-dle'],
  'LE SSERAFIM': ['le sserafim', 'le-sserafim', 'lesserafim'],
  'NewJeans': ['newjeans', 'new jeans'],
  'aespa': ['aespa'],
};

async function main() {
  const { data: groups } = await db.from('groups').select('id, name, slug, display_color');
  const { data: namGames } = await db.from('games').select('slug, content').eq('game_type', 'name_all_members');

  // photo index: normalized name/alias -> photo_url, per group slug guess
  const photoByGroup = new Map(); // groupId or name -> Map(normName -> photo)
  const globalPhoto = new Map();
  for (const g of namGames ?? []) {
    for (const mem of g.content?.members ?? []) {
      if (!mem.photo_url) continue;
      globalPhoto.set(norm(mem.name), mem.photo_url);
      for (const al of mem.aliases ?? []) globalPhoto.set(norm(al), mem.photo_url);
    }
  }

  const resolveGroup = (bankName) => {
    const cands = [bankName.toLowerCase(), slugify(bankName), ...(GROUP_ALIAS[bankName] ?? [])];
    return groups.find((g) => cands.includes(g.name.toLowerCase()) || cands.includes(g.slug.toLowerCase())
      || cands.includes(norm(g.name)) || cands.includes(norm(g.slug)));
  };

  const profileRows = [];
  const report = [];
  let unresolvedGroups = [];
  for (const bg of groupsFromBank) {
    const g = resolveGroup(bg.groupName);
    if (!g) { unresolvedGroups.push(bg.groupName); continue; }
    let withPhoto = 0;
    bg.members.forEach((mem, i) => {
      const photo = globalPhoto.get(norm(mem.name)) ?? null;
      if (photo) withPhoto++;
      profileRows.push({
        group_id: g.id,
        member_name: mem.name,
        member_slug: slugify(mem.name),
        photo_url: photo,
        axes: mem.axes,
        trait_lines: mem.trait_lines,
        ord: i,
        active: true,
      });
    });
    report.push(`${bg.groupName} -> group ${g.id} (${g.slug}): ${bg.members.length} members, ${withPhoto} photos`);
  }

  console.log('=== GROUP RESOLUTION + PHOTO COVERAGE ===');
  report.forEach((r) => console.log(r));
  if (unresolvedGroups.length) console.log('!! UNRESOLVED GROUPS:', unresolvedGroups);
  const totalMembers = profileRows.length;
  const totalPhotos = profileRows.filter((p) => p.photo_url).length;
  const missingPhotos = profileRows.filter((p) => !p.photo_url).map((p) => `${p.member_name}`);
  const badTraits = profileRows.filter((p) => p.trait_lines.length !== 3).map((p) => `${p.member_name}(${p.trait_lines.length})`);
  console.log(`\nTOTALS: ${totalMembers} members, ${totalPhotos}/${totalMembers} photos, questions: ${QUESTIONS.length}`);
  if (missingPhotos.length) console.log('MISSING PHOTOS:', missingPhotos.join(', '));
  if (badTraits.length) console.log('!! MEMBERS WITHOUT 3 TRAIT LINES:', badTraits.join(', '));

  if (DRY) { console.log('\n[dry run: no writes]'); return; }

  // idempotent insert
  await db.from('personality_questions').delete().neq('ord', -1);
  await db.from('personality_profiles').delete().neq('id', -1);
  const { error: qErr } = await db.from('personality_questions').insert(
    QUESTIONS.map((q) => ({ ord: q.ord, question: q.question, options: q.options, active: true })),
  );
  if (qErr) { console.error('question insert failed:', qErr.message); process.exit(1); }
  // chunk profiles
  for (let i = 0; i < profileRows.length; i += 50) {
    const { error } = await db.from('personality_profiles').insert(profileRows.slice(i, i + 50));
    if (error) { console.error('profile insert failed:', error.message); process.exit(1); }
  }
  const { count: qc } = await db.from('personality_questions').select('*', { count: 'exact', head: true });
  const { count: pc } = await db.from('personality_profiles').select('*', { count: 'exact', head: true });
  console.log(`\nINSERTED: ${qc} questions, ${pc} profiles.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
