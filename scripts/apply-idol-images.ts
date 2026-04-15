import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load env
const envContent = fs.readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ============================================================
// Idol name -> image path mapping
// Key: "IdolName|GroupContext" (group context helps disambiguate)
// ============================================================

const IDOL_IMAGE_MAP: Record<string, string> = {
  // BTS
  'RM|BTS': '/idols/RM BTS.jpg',
  'Jin|BTS': '/idols/Jin BTS.jpg',
  'Suga|BTS': '/idols/Suga BTS.jpg',
  'J-Hope|BTS': '/idols/J-Hope BTS.jpg',
  'Jimin|BTS': '/idols/Jimin BTS.jpg',
  'V|BTS': '/idols/V BTS.jpg',
  'Jungkook|BTS': '/idols/Jungkook BTS.jpg',
  // BLACKPINK
  'Jisoo|BLACKPINK': '/idols/Jisoo BLACKPINK.jpg',
  'Jennie|BLACKPINK': '/idols/Jennie BLACKPINK.jpg',
  'Rose|BLACKPINK': '/idols/Rose BLACKPINK.jpg',
  'Lisa|BLACKPINK': '/idols/Lisa BLACKPINK.jpg',
  // TWICE
  'Nayeon|TWICE': '/idols/Nayeon Twice.jpg',
  'Jeongyeon|TWICE': '/idols/Jeongyeon Twice.jpg',
  'Momo|TWICE': '/idols/Momo Twice.jpg',
  'Sana|TWICE': '/idols/Sana Twice.jpg',
  'Jihyo|TWICE': '/idols/Jihyo Twice.jpg',
  'Mina|TWICE': '/idols/Mina Twice.jpg',
  'Dahyun|TWICE': '/idols/Dahyun TWICE.jpg',
  'Chaeyoung|TWICE': '/idols/Chaeyoung Twice.jpg',
  'Tzuyu|TWICE': '/idols/Tzuyu Twice.jpg',
  // Stray Kids
  'Bang Chan|SKZ': '/idols/Bang Chan STRYKIDS.jpg',
  'Lee Know|SKZ': '/idols/Lee Know STAYKIDS.jpg',
  'Changbin|SKZ': '/idols/Changbin STRAYKIDS.jpg',
  'Hyunjin|SKZ': '/idols/Hyunjin STRAYKIDS.jpg',
  'Han|SKZ': '/idols/Han STRAYKIDS.jpg',
  'Felix|SKZ': '/idols/Felix STRAYKIDS.jpg',
  'Seungmin|SKZ': '/idols/Seungmin STRAYKIDS.jpg',
  'I.N|SKZ': '/idols/I.N stray kids.jpg',
  // SEVENTEEN
  'S.Coups|SVT': '/idols/S.Coups SEVENTEEN.jpg',
  'Jeonghan|SVT': '/idols/Jeonghan SEVENTEEN.jpg',
  'Joshua|SVT': '/idols/Joshua SEVENTEEN.jpg',
  'Jun|SVT': '/idols/Jun SEVENTEEN.jpg',
  'Hoshi|SVT': '/idols/Hoshi SEVENTEEN.jpg',
  'Wonwoo|SVT': '/idols/Wonwoo SEVENTEEN.jpg',
  'Woozi|SVT': '/idols/Woozi SEVENTEEN.jpg',
  'DK|SVT': '/idols/DK SEVENTEEN.jpg',
  'Mingyu|SVT': '/idols/Mingyu SEVENTEEN.jpg',
  'The8|SVT': '/idols/The8 SEVENTEEN.jpg',
  'Seungkwan|SVT': '/idols/Seungkwan SEVENTEEN.jpg',
  'Vernon|SVT': '/idols/Vernon SEVENTEEN.jpg',
  'Dino|SVT': '/idols/Dino SEVENTEEN.jpg',
  // aespa
  'Karina|AESPA': '/idols/Karina AESPA.jpg',
  'Giselle|AESPA': '/idols/Giselle AESPA.jpg',
  'Winter|AESPA': '/idols/Winter AESPA.jpg',
  'Ningning|AESPA': '/idols/Ningning AESPA.jpg',
  // NewJeans
  'Minji|NJ': '/idols/Minji NEWJEANS.jpg',
  'Hanni|NJ': '/idols/Hanni NEWJEANS.jpg',
  'Danielle|NJ': '/idols/Danielle NEWJEANS.jpg',
  'Haerin|NJ': '/idols/Haerin NEWJEANS.jpg',
  'Hyein|NJ': '/idols/Hyein NEWJEANS.jpg',
  // IVE
  'Yujin|IVE': '/idols/Yujin IVE.jpg',
  'Gaeul|IVE': '/idols/Gaeul IVE.jpg',
  'Rei|IVE': '/idols/Rei IVE.jpg',
  'Wonyoung|IVE': '/idols/Wonyoung IVE.jpg',
  'Liz|IVE': '/idols/Liz IVE.jpg',
  'Leeseo|IVE': '/idols/Leeseo IVE.jpg',
  // LE SSERAFIM
  'Sakura|LSF': '/idols/Sakura LESSERAFIM.jpg',
  'Chaewon|LSF': '/idols/Chaewon LESSERAFIM.jpg',
  'Yunjin|LSF': '/idols/Yunjin LESSERAFIM.jpg',
  'Kazuha|LSF': '/idols/Kazuha LESSERAFIM.jpg',
  'Eunchae|LSF': '/idols/Eunchae LESSERAFIM.jpg',
  // EXO
  'Xiumin|EXO': '/idols/Xiumin EXO.jpg',
  'Suho|EXO': '/idols/Suho EXO.jpg',
  'Lay|EXO': '/idols/Lay EXO.jpg',
  'Baekhyun|EXO': '/idols/Baekhyun EXO.jpg',
  'Chen|EXO': '/idols/Chen EXO.jpg',
  'Chanyeol|EXO': '/idols/Chanyeol EXO.jpg',
  'D.O.|EXO': '/idols/D.O. EXO.jpg',
  'Kai|EXO': '/idols/Kai EXO.jpg',
  'Sehun|EXO': '/idols/Sehun EXO.jpg',
  // ENHYPEN
  'Heeseung|ENH': '/idols/Heeseung ENHYPEN.jpg',
  'Jay|ENH': '/idols/Jay ENHYPEN.jpg',
  'Jake|ENH': '/idols/Jake ENHYPEN.jpg',
  'Sunghoon|ENH': '/idols/Sunghoon ENHYPEN.jpg',
  'Sunoo|ENH': '/idols/Sunoo ENHYPEN.jpg',
  'Jungwon|ENH': '/idols/Jungwon ENHYPEN.jpg',
  'Ni-ki|ENH': '/idols/Ni-ki ENHYPEN.jpg',
  // TXT
  'Soobin|TXT': '/idols/Soobin TXT.jpg',
  'Yeonjun|TXT': '/idols/Yeonjun TXT.jpg',
  'Beomgyu|TXT': '/idols/Beomgyu TXT.jpg',
  'Taehyun|TXT': '/idols/Taehyun TXT.jpg',
  'Huening Kai|TXT': '/idols/Huening Kai TXT.jpg',
  // ATEEZ
  'Hongjoong|ATZ': '/idols/Hongjoong ATEEZ.jpg',
  'Seonghwa|ATZ': '/idols/Seonghwa ATEEZ.jpg',
  'Yunho|ATZ': '/idols/Yunho ATEEZ.jpg',
  'Yeosang|ATZ': '/idols/Yeosang ATEEZ.jpg',
  'San|ATZ': '/idols/San ATEEZ.jpg',
  'Mingi|ATZ': '/idols/Mingi ATEEZ.jpg',
  'Wooyoung|ATZ': '/idols/Wooyoung ATEEZ.jpg',
  'Jongho|ATZ': '/idols/Jongho ATEEZ.jpg',
  // Red Velvet
  'Irene|RV': '/idols/Irene REDVELVET.jpg',
  'Seulgi|RV': '/idols/Seulgi REDVELVET.jpg',
  'Wendy|RV': '/idols/Wendy REDVELVET.jpg',
  'Joy|RV': '/idols/Joy REDVELVET.jpg',
  'Yeri|RV': '/idols/Yeri REDVELVET.jpg',
  // ITZY
  'Yeji|ITZY': '/idols/Yeji ITZY.jpg',
  'Lia|ITZY': '/idols/Lia ITZY.jpg',
  'Ryujin|ITZY': '/idols/Ryujin ITZY.jpg',
  'Chaeryeong|ITZY': '/idols/Chaeryeong ITZY.jpg',
  'Yuna|ITZY': '/idols/Yuna ITZY.jpg',
  // (G)I-DLE
  'Miyeon|IDLE': '/idols/Miyeon G-idle.jpg',
  'Minnie|IDLE': '/idols/Minnie G-IDLE.jpg',
  'Soyeon|IDLE': '/idols/Soyeon G-IDLE.jpg',
  'Yuqi|IDLE': '/idols/Yuqi G-IDLE.jpg',
  'Shuhua|IDLE': '/idols/Shuhua G-IDLE.jpg',
  // NCT 127
  'Taeyong|NCT127': '/idols/Taeyong NCT 127.jpg',
  'Taeil|NCT127': '/idols/Taeil NCT 127.jpg',
  'Johnny|NCT127': '/idols/Johnny NCT 127.jpg',
  'Yuta|NCT127': '/idols/Yuta NCT 127.jpg',
  'Doyoung|NCT127': '/idols/Doyoung NCT 127.jpg',
  'Jaehyun|NCT127': '/idols/Jaehyun NCT 127.jpg',
  'Jungwoo|NCT127': '/idols/Jungwoo NCT 127.jpg',
  'Mark|NCT127': '/idols/Mark NCT 127.jpg',
  'Haechan|NCT127': '/idols/Haechan NCT 127.jpg',
  // NCT Dream
  'Mark|NCTD': '/idols/Mark NCT DREAM.jpg',
  'Renjun|NCTD': '/idols/Renjun NCT DREAM.jpg',
  'Jeno|NCTD': '/idols/Jeno NCT DREAM.jpg',
  'Haechan|NCTD': '/idols/Haechan NCT DREAL.jpg',
  'Jaemin|NCTD': '/idols/Jaemin NCT DREAM.jpg',
  'Chenle|NCTD': '/idols/Chenle NCT DREAM.jpg',
  'Jisung|NCTD': '/idols/Jisung NCT DREAM.jpg',
  // SHINee
  'Onew|SHINEE': '/idols/Onew SHINEE.jpg',
  'Key|SHINEE': '/idols/Key SHINee.jpg',
  'Minho|SHINEE': '/idols/Minho SHINee.jpg',
  'Taemin|SHINEE': '/idols/Taemin SHINee.jpg',
  // NMIXX
  'Lily|NMIXX': '/idols/Lily NMIXX.jpg',
  'Haewon|NMIXX': '/idols/Haewon NMIXX.jpg',
  'Sullyoon|NMIXX': '/idols/Sullyoon NMIXX.jpg',
  'Bae|NMIXX': '/idols/Bae NMIXX.jpg',
  'Jiwoo|NMIXX': '/idols/Jiwoo NMIXX.jpg',
  'Kyujin|NMIXX': '/idols/Kyujin NMIXX.jpg',
  // GOT7
  'JB|GOT7': '/idols/JB GOT7.jpg',
  'Mark|GOT7': '/idols/Mark GOT7.jpg',
  'Jackson|GOT7': '/idols/Jackson GOT7.jpg',
  'Jinyoung|GOT7': '/idols/Jinyoung GOT7.jpg',
  'Youngjae|GOT7': '/idols/Youngjae GOT7.jpg',
  'BamBam|GOT7': '/idols/BamBam GOT7.jpg',
  'Yugyeom|GOT7': '/idols/Yugyeom GOT7.jpg',
  // MAMAMOO
  'Solar|MMM': '/idols/Solar MAMAMOO.jpg',
  'Moonbyul|MMM': '/idols/Moonbyul MAMAMOO.jpg',
  'Wheein|MMM': '/idols/Wheein MAMAMOO.jpg',
  'Hwasa|MMM': '/idols/Hwasa MAMAMOO.jpg',
  // TREASURE
  'Hyunsuk|TRS': '/idols/Hyunsuk Treasure.jpg',
  'Jihoon|TRS': '/idols/Jihoon Treasure.jpg',
  'Yoshi|TRS': '/idols/Yoshi Trasure.jpg',
  'Junkyu|TRS': '/idols/Junkyu Treasure.jpg',
  'Mashiho|TRS': '/idols/Mashiho Treasure.jpg',
  'Jaehyuk|TRS': '/idols/Jaehyuk Treasure.jpg',
  'Asahi|TRS': '/idols/Asahi Treasure.jpg',
  'Yedam|TRS': '/idols/Yedam Treasure.jpg',
  'Doyoung|TRS': '/idols/Doyoung Treasure.jpg',
  'Haruto|TRS': '/idols/Haruto Treasure.jpg',
  // BABYMONSTER
  'Ruka|BM': '/idols/Ruka BABYMONSTER.jpg',
  'Pharita|BM': '/idols/Pharita BABYMONSTER.jpg',
  'Asa|BM': '/idols/Asa BABYMONSTER.jpg',
  'Ahyeon|BM': '/idols/Ahyeon BABYMONSTER.jpg',
  'Rami|BM': '/idols/Rami BABYMONSTER.jpg',
  'Chiquita|BM': '/idols/Chiquita BABYMONSTER.jpg',
  'Haram|BM': '/idols/Haram BABYMONSTER.jpg',
};

// Flat lookup by name only (for cases where group context is unknown/ambiguous).
// Picks the first match - works for unique names.
const FLAT_MAP: Record<string, string> = {};
for (const [key, val] of Object.entries(IDOL_IMAGE_MAP)) {
  const name = key.split('|')[0];
  if (!FLAT_MAP[name]) FLAT_MAP[name] = val;
}

// Game slug -> group context mapping for name-all games
const GAME_GROUP_CTX: Record<string, string> = {
  'name-all-bts': 'BTS',
  'name-all-blackpink': 'BLACKPINK',
  'name-all-twice': 'TWICE',
  'name-all-stray-kids': 'SKZ',
  'name-all-seventeen': 'SVT',
  'name-all-aespa': 'AESPA',
  'name-all-newjeans': 'NJ',
  'name-all-ive': 'IVE',
  'name-all-le-sserafim': 'LSF',
  'name-all-exo': 'EXO',
  'name-all-enhypen': 'ENH',
  'name-all-txt': 'TXT',
  'name-all-ateez': 'ATZ',
  'name-all-red-velvet': 'RV',
  'name-all-itzy': 'ITZY',
  'name-all-gidle': 'IDLE',
  'name-all-nct-127': 'NCT127',
  'name-all-nct-dream': 'NCTD',
  'name-all-shinee': 'SHINEE',
  'name-all-nmixx': 'NMIXX',
  'name-all-got7': 'GOT7',
  'name-all-mamamoo': 'MMM',
  'name-all-treasure': 'TRS',
  'name-all-babymonster': 'BM',
};

// This or That subtitle -> group context mapping
const TOT_GROUP_CTX: Record<string, string> = {
  'BTS': 'BTS', 'BLACKPINK': 'BLACKPINK', 'TWICE': 'TWICE',
  'Stray Kids': 'SKZ', 'SEVENTEEN': 'SVT', 'aespa': 'AESPA',
  'NewJeans': 'NJ', 'IVE': 'IVE', 'LE SSERAFIM': 'LSF',
  'EXO': 'EXO', 'ENHYPEN': 'ENH', 'TXT': 'TXT', 'ATEEZ': 'ATZ',
  'Red Velvet': 'RV', 'ITZY': 'ITZY', '(G)I-DLE': 'IDLE',
  'NCT 127': 'NCT127', 'NCT Dream': 'NCTD', 'SHINee': 'SHINEE',
  'NMIXX': 'NMIXX', 'GOT7': 'GOT7', 'MAMAMOO': 'MMM',
  'TREASURE': 'TRS', 'BABYMONSTER': 'BM', 'ASTRO': 'ASTRO',
  // For "position" style subtitles in group-specific categories
  'Leader, Main rapper': 'BTS', 'Visual, Vocal': 'BTS',
  'Lead rapper, Producer': 'BTS', 'Main dancer, Rapper': 'BTS',
  'Main dancer, Vocal': 'BTS', 'Main vocal, Center': 'BTS',
  'Visual, Vocal, Center': 'BLACKPINK', 'Rapper, Vocal, Center': 'BLACKPINK',
  'Main vocal': 'BLACKPINK', 'Main dancer, Rapper': 'BLACKPINK',
};

function resolveImage(name: string, groupHint: string): string | null {
  const ctx = TOT_GROUP_CTX[groupHint] ?? groupHint;
  return IDOL_IMAGE_MAP[`${name}|${ctx}`] ?? FLAT_MAP[name] ?? null;
}

// ============================================================
// 1. Update name-all-members games
// ============================================================

async function updateNameAllGames() {
  console.log('\n=== Updating Name All Members games ===\n');

  const { data: games } = await supabase
    .from('games')
    .select('id, slug, content')
    .eq('game_type', 'name_all_members');

  if (!games?.length) {
    console.log('  No name-all-members games found.');
    return;
  }

  let updated = 0;
  for (const game of games) {
    const ctx = GAME_GROUP_CTX[game.slug];
    if (!ctx) continue;

    const content = game.content as { members: { name: string; photo_url: string | null }[] };
    let changed = false;

    for (const member of content.members) {
      const img = IDOL_IMAGE_MAP[`${member.name}|${ctx}`];
      if (img && member.photo_url !== img) {
        member.photo_url = img;
        changed = true;
      }
    }

    if (changed) {
      const { error } = await supabase
        .from('games')
        .update({ content })
        .eq('id', game.id);

      if (error) {
        console.error(`  Failed to update "${game.slug}": ${error.message}`);
      } else {
        const count = content.members.filter(m => m.photo_url).length;
        console.log(`  Updated "${game.slug}" - ${count}/${content.members.length} members have photos`);
        updated++;
      }
    }
  }

  console.log(`\n  Updated ${updated}/${games.length} games.`);
}

// ============================================================
// 2. Update This or That items
// ============================================================

async function updateTotItems() {
  console.log('\n=== Updating This or That items ===\n');

  // Get idol-type categories
  const { data: cats } = await supabase
    .from('tot_categories')
    .select('id, title, type')
    .eq('type', 'idol');

  if (!cats?.length) {
    console.log('  No idol-type categories found.');
    return;
  }

  const catIds = cats.map(c => c.id);

  const { data: items } = await supabase
    .from('tot_items')
    .select('id, name, subtitle, image_url')
    .in('category_id', catIds);

  if (!items?.length) {
    console.log('  No items found.');
    return;
  }

  let updated = 0;
  for (const item of items) {
    const img = resolveImage(item.name, item.subtitle ?? '');
    if (img && item.image_url !== img) {
      const { error } = await supabase
        .from('tot_items')
        .update({ image_url: img })
        .eq('id', item.id);

      if (!error) updated++;
    }
  }

  console.log(`  Updated ${updated}/${items.length} idol items with images.`);
}

// ============================================================
// 3. Update intruder quiz options
// ============================================================

async function updateIntruderQuizzes() {
  console.log('\n=== Updating intruder quiz option images ===\n');

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, slug, questions')
    .eq('quiz_type', 'intruder');

  if (!quizzes?.length) {
    console.log('  No intruder quizzes found.');
    return;
  }

  let updated = 0;
  for (const quiz of quizzes) {
    const questions = quiz.questions as {
      question: string;
      options: { label: string; image_url: string | null }[];
      correct: number;
      fun_fact: string;
    }[];

    let changed = false;
    for (const q of questions) {
      for (const opt of q.options) {
        // Extract idol name from label (handle "Name (Group)" format)
        const nameMatch = opt.label.match(/^([^(]+)/);
        const idolName = nameMatch ? nameMatch[1].trim() : opt.label;
        const img = FLAT_MAP[idolName];
        if (img && opt.image_url !== img) {
          opt.image_url = img;
          changed = true;
        }
      }
    }

    if (changed) {
      const { error } = await supabase
        .from('quizzes')
        .update({ questions })
        .eq('id', quiz.id);

      if (error) {
        console.error(`  Failed "${quiz.title}": ${error.message}`);
      } else {
        console.log(`  Updated "${quiz.title}"`);
        updated++;
      }
    }
  }

  console.log(`\n  Updated ${updated}/${quizzes.length} intruder quizzes.`);
}

// ============================================================
// 4. Update image quiz questions (guess the idol)
// ============================================================

async function updateImageQuizzes() {
  console.log('\n=== Updating image quiz questions ===\n');

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, slug, questions')
    .eq('quiz_type', 'image');

  if (!quizzes?.length) {
    console.log('  No image quizzes found.');
    return;
  }

  // Only update "guess the idol" quizzes, not album/company/childhood quizzes
  const idolQuizSlugs = [
    'can-you-name-these-male-kpop-idols',
  ];

  let updated = 0;
  for (const quiz of quizzes) {
    if (!idolQuizSlugs.includes(quiz.slug)) continue;

    const questions = quiz.questions as {
      question: string;
      image_url: string | null;
      options: string[];
      correct: number;
      fun_fact: string;
    }[];

    let changed = false;
    for (const q of questions) {
      const correctIdol = q.options[q.correct];
      const img = FLAT_MAP[correctIdol];
      if (img && q.image_url !== img) {
        q.image_url = img;
        changed = true;
      }
    }

    if (changed) {
      const { error } = await supabase
        .from('quizzes')
        .update({ questions })
        .eq('id', quiz.id);

      if (error) {
        console.error(`  Failed "${quiz.title}": ${error.message}`);
      } else {
        console.log(`  Updated "${quiz.title}"`);
        updated++;
      }
    }
  }

  console.log(`\n  Updated ${updated} image quizzes.`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('Applying idol images to existing database records...');

  await updateNameAllGames();
  await updateTotItems();
  await updateIntruderQuizzes();
  await updateImageQuizzes();

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
