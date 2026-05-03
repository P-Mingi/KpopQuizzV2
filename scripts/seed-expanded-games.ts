import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load env (allow overrides from process.env for production)
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envContent.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0 && !process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ============================================================
// Types
// ============================================================

type Difficulty = 'easy' | 'medium' | 'hard';
type GameType = 'name_all_groups' | 'name_all_idols' | 'name_all_songs' | 'name_top_songs';
type SubType = 'gen_groups' | 'girl_idols' | 'boy_idols' | 'album_songs' | 'top_hits';

interface ItemDef {
  name: string;
  aliases: string[];
  group?: string;   // for idol games
  album?: string;   // for album song games (item-level, optional)
  artist?: string;  // for top-hit songs with mixed artists
  image_url?: string; // path to idol photo in /idols/
}

// Idol image filename lookup: key = "name:group" -> filename in public/idols/
const IDOL_IMAGES: Record<string, string> = {
  // BLACKPINK
  'Jennie:BLACKPINK': 'Jennie BLACKPINK.jpg',
  'Lisa:BLACKPINK': 'Lisa BLACKPINK.jpg',
  'Rose:BLACKPINK': 'Rose BLACKPINK.jpg',
  'Jisoo:BLACKPINK': 'Jisoo BLACKPINK.jpg',
  // aespa
  'Karina:aespa': 'Karina AESPA.jpg',
  'Winter:aespa': 'Winter AESPA.jpg',
  'Giselle:aespa': 'Giselle AESPA.jpg',
  'Ningning:aespa': 'Ningning AESPA.jpg',
  // IVE
  'Wonyoung:IVE': 'Wonyoung IVE.jpg',
  'Yujin:IVE': 'Yujin IVE.jpg',
  'Gaeul:IVE': 'Gaeul IVE.jpg',
  'Rei:IVE': 'Rei IVE.jpg',
  'Liz:IVE': 'Liz IVE.jpg',
  'Leeseo:IVE': 'Leeseo IVE.jpg',
  // NewJeans
  'Minji:NewJeans': 'Minji NEWJEANS.jpg',
  'Hanni:NewJeans': 'Hanni NEWJEANS.jpg',
  'Danielle:NewJeans': 'Danielle NEWJEANS.jpg',
  'Haerin:NewJeans': 'Haerin NEWJEANS.jpg',
  'Hyein:NewJeans': 'Hyein NEWJEANS.jpg',
  // LE SSERAFIM
  'Chaewon:LE SSERAFIM': 'Chaewon LESSERAFIM.jpg',
  'Sakura:LE SSERAFIM': 'Sakura LESSERAFIM.jpg',
  'Yunjin:LE SSERAFIM': 'Yunjin LESSERAFIM.jpg',
  'Kazuha:LE SSERAFIM': 'Kazuha LESSERAFIM.jpg',
  'Eunchae:LE SSERAFIM': 'Eunchae LESSERAFIM.jpg',
  // TWICE
  'Nayeon:TWICE': 'Nayeon Twice.jpg',
  'Sana:TWICE': 'Sana Twice.jpg',
  'Momo:TWICE': 'Momo Twice.jpg',
  'Jihyo:TWICE': 'Jihyo Twice.jpg',
  'Mina:TWICE': 'Mina Twice.jpg',
  'Dahyun:TWICE': 'Dahyun TWICE.jpg',
  'Chaeyoung:TWICE': 'Chaeyoung Twice.jpg',
  'Tzuyu:TWICE': 'Tzuyu Twice.jpg',
  'Jeongyeon:TWICE': 'Jeongyeon Twice.jpg',
  // ITZY
  'Yeji:ITZY': 'Yeji ITZY.jpg',
  'Ryujin:ITZY': 'Ryujin ITZY.jpg',
  'Lia:ITZY': 'Lia ITZY.jpg',
  'Chaeryeong:ITZY': 'Chaeryeong ITZY.jpg',
  'Yuna:ITZY': 'Yuna ITZY.jpg',
  // (G)I-DLE
  'Soyeon:(G)I-DLE': 'Soyeon G-IDLE.jpg',
  'Miyeon:(G)I-DLE': 'Miyeon G-idle.jpg',
  'Minnie:(G)I-DLE': 'Minnie G-IDLE.jpg',
  'Yuqi:(G)I-DLE': 'Yuqi G-IDLE.jpg',
  'Shuhua:(G)I-DLE': 'Shuhua G-IDLE.jpg',
  // Red Velvet
  'Irene:Red Velvet': 'Irene REDVELVET.jpg',
  'Seulgi:Red Velvet': 'Seulgi REDVELVET.jpg',
  'Wendy:Red Velvet': 'Wendy REDVELVET.jpg',
  'Joy:Red Velvet': 'Joy REDVELVET.jpg',
  'Yeri:Red Velvet': 'Yeri REDVELVET.jpg',
  // MAMAMOO
  'Hwasa:MAMAMOO': 'Hwasa MAMAMOO.jpg',
  'Solar:MAMAMOO': 'Solar MAMAMOO.jpg',
  'Moonbyul:MAMAMOO': 'Moonbyul MAMAMOO.jpg',
  'Wheein:MAMAMOO': 'Wheein MAMAMOO.jpg',
  // NMIXX
  'Lily:NMIXX': 'Lily NMIXX.jpg',
  'Haewon:NMIXX': 'Haewon NMIXX.jpg',
  'Sullyoon:NMIXX': 'Sullyoon NMIXX.jpg',
  'Bae:NMIXX': 'Bae NMIXX.jpg',
  'Jiwoo:NMIXX': 'Jiwoo NMIXX.jpg',
  'Kyujin:NMIXX': 'Kyujin NMIXX.jpg',
  // BTS
  'Jungkook:BTS': 'Jungkook BTS.jpg',
  'V:BTS': 'V BTS.jpg',
  'Jimin:BTS': 'Jimin BTS.jpg',
  'RM:BTS': 'RM BTS.jpg',
  'Suga:BTS': 'Suga BTS.jpg',
  'Jin:BTS': 'Jin BTS.jpg',
  'J-Hope:BTS': 'J-Hope BTS.jpg',
  // Stray Kids
  'Felix:Stray Kids': 'Felix STRAYKIDS.jpg',
  'Hyunjin:Stray Kids': 'Hyunjin STRAYKIDS.jpg',
  'Bang Chan:Stray Kids': 'Bang Chan STRYKIDS.jpg',
  'Han:Stray Kids': 'Han STRAYKIDS.jpg',
  'Lee Know:Stray Kids': 'Lee Know STAYKIDS.jpg',
  'Changbin:Stray Kids': 'Changbin STRAYKIDS.jpg',
  'Seungmin:Stray Kids': 'Seungmin STRAYKIDS.jpg',
  'I.N:Stray Kids': 'I.N stray kids.jpg',
  // SEVENTEEN
  'Mingyu:SEVENTEEN': 'Mingyu SEVENTEEN.jpg',
  'Hoshi:SEVENTEEN': 'Hoshi SEVENTEEN.jpg',
  'Woozi:SEVENTEEN': 'Woozi SEVENTEEN.jpg',
  'Seungkwan:SEVENTEEN': 'Seungkwan SEVENTEEN.jpg',
  'S.Coups:SEVENTEEN': 'S.Coups SEVENTEEN.jpg',
  'Jeonghan:SEVENTEEN': 'Jeonghan SEVENTEEN.jpg',
  'Joshua:SEVENTEEN': 'Joshua SEVENTEEN.jpg',
  'Jun:SEVENTEEN': 'Jun SEVENTEEN.jpg',
  'Wonwoo:SEVENTEEN': 'Wonwoo SEVENTEEN.jpg',
  'DK:SEVENTEEN': 'DK SEVENTEEN.jpg',
  'The8:SEVENTEEN': 'The8 SEVENTEEN.jpg',
  'Vernon:SEVENTEEN': 'Vernon SEVENTEEN.jpg',
  'Dino:SEVENTEEN': 'Dino SEVENTEEN.jpg',
  // ATEEZ
  'San:ATEEZ': 'San ATEEZ.jpg',
  'Hongjoong:ATEEZ': 'Hongjoong ATEEZ.jpg',
  'Wooyoung:ATEEZ': 'Wooyoung ATEEZ.jpg',
  'Seonghwa:ATEEZ': 'Seonghwa ATEEZ.jpg',
  'Yunho:ATEEZ': 'Yunho ATEEZ.jpg',
  'Yeosang:ATEEZ': 'Yeosang ATEEZ.jpg',
  'Mingi:ATEEZ': 'Mingi ATEEZ.jpg',
  'Jongho:ATEEZ': 'Jongho ATEEZ.jpg',
  // TXT
  'Yeonjun:TXT': 'Yeonjun TXT.jpg',
  'Soobin:TXT': 'Soobin TXT.jpg',
  'Beomgyu:TXT': 'Beomgyu TXT.jpg',
  'Taehyun:TXT': 'Taehyun TXT.jpg',
  'Huening Kai:TXT': 'Huening Kai TXT.jpg',
  // ENHYPEN
  'Heeseung:ENHYPEN': 'Heeseung ENHYPEN.jpg',
  'Jake:ENHYPEN': 'Jake ENHYPEN.jpg',
  'Sunghoon:ENHYPEN': 'Sunghoon ENHYPEN.jpg',
  'Jay:ENHYPEN': 'Jay ENHYPEN.jpg',
  'Sunoo:ENHYPEN': 'Sunoo ENHYPEN.jpg',
  'Jungwon:ENHYPEN': 'Jungwon ENHYPEN.jpg',
  'Ni-ki:ENHYPEN': 'Ni-ki ENHYPEN.jpg',
  // NCT 127
  'Taeyong:NCT 127': 'Taeyong NCT 127.jpg',
  'Mark:NCT 127': 'Mark NCT 127.jpg',
  'Haechan:NCT 127': 'Haechan NCT 127.jpg',
  'Johnny:NCT 127': 'Johnny NCT 127.jpg',
  'Yuta:NCT 127': 'Yuta NCT 127.jpg',
  'Doyoung:NCT 127': 'Doyoung NCT 127.jpg',
  'Jaehyun:NCT 127': 'Jaehyun NCT 127.jpg',
  'Jungwoo:NCT 127': 'Jungwoo NCT 127.jpg',
  'Taeil:NCT 127': 'Taeil NCT 127.jpg',
  // EXO
  'Baekhyun:EXO': 'Baekhyun EXO.jpg',
  'Kai:EXO': 'Kai EXO.jpg',
  'Chanyeol:EXO': 'Chanyeol EXO.jpg',
  'D.O.:EXO': 'D.O. EXO.jpg',
  'Suho:EXO': 'Suho EXO.jpg',
  'Sehun:EXO': 'Sehun EXO.jpg',
  'Chen:EXO': 'Chen EXO.jpg',
  'Xiumin:EXO': 'Xiumin EXO.jpg',
  'Lay:EXO': 'Lay EXO.jpg',
  // SHINee
  'Taemin:SHINee': 'Taemin SHINee.jpg',
  'Key:SHINee': 'Key SHINee.jpg',
  'Minho:SHINee': 'Minho SHINee.jpg',
  'Onew:SHINee': 'Onew SHINEE.jpg',
  // GOT7
  'Jackson:GOT7': 'Jackson GOT7.jpg',
  'JB:GOT7': 'JB GOT7.jpg',
  'Mark:GOT7': 'Mark GOT7.jpg',
  'Jinyoung:GOT7': 'Jinyoung GOT7.jpg',
  'Youngjae:GOT7': 'Youngjae GOT7.jpg',
  'BamBam:GOT7': 'BamBam GOT7.jpg',
  'Yugyeom:GOT7': 'Yugyeom GOT7.jpg',
};

// Group image filename lookup for name_all_groups games
const GROUP_IMAGES: Record<string, string> = {
  'Stray Kids': 'Stray Kids.jpg',
  'ATEEZ': 'ATEEZ.jpg',
  'TXT': 'TXT.jpg',
  'ENHYPEN': 'ENHYPEN.jpg',
  'aespa': 'Aespa.jpg',
  'IVE': 'IVE.jpg',
  'NewJeans': 'NewJeans.jpg',
  'LE SSERAFIM': 'LE SSERAFIM.jpg',
  'ITZY': 'ITZY.jpg',
  '(G)I-DLE': '(G)I-DLE.jpg',
  'NMIXX': 'NMIXX.jpg',
  'TREASURE': 'TREASURE.jpg',
  'Kep1er': 'Kep1er.jpg',
  'NCT Dream': 'NCT Dream.jpg',
  'RIIZE': 'RIIZE.jpg',
  'BTS': 'BTS.jpg',
  'BLACKPINK': 'BLACKPINK.jpg',
  'TWICE': 'TWICE.jpg',
  'EXO': 'EXO.jpg',
  'SEVENTEEN': 'SEVENTEEN.jpg',
  'Red Velvet': 'Red Velvet.jpg',
  'GOT7': 'GOT7.jpg',
  'MAMAMOO': 'MAMAMOO.jpg',
  'NCT 127': 'NCT 127.jpg',
  'SHINee': 'SHINee.jpg',
  "Girls' Generation": "Girls' Generation.jpg",
  'Super Junior': 'Super Junior.jpg',
  'BIGBANG': 'BIGBANG.jpg',
  '2NE1': '2NE1.jpg',
  'f(x)': 'f(x).jpg',
  '2PM': '2PM.jpg',
  'Wonder Girls': 'Wonder Girls.jpg',
  'BABYMONSTER': 'BABYMONSTER.jpg',
  'BOYNEXTDOOR': 'BOYNEXTDOOR.jpg',
};

interface GameDef {
  title: string;
  slug: string;
  groupSlug: string;
  game_type: GameType;
  sub_type: SubType;
  timer: number;
  difficulty: Difficulty;
  items: ItemDef[];
  album?: string;   // content-level album (for album_songs games)
  artist?: string;  // content-level artist (for album/top songs games)
}

// ============================================================
// Game data
// ============================================================

const GAMES: GameDef[] = [
  // -------------------------------------------------------
  // Generation groups (name_all_groups / gen_groups)
  // -------------------------------------------------------
  {
    title: 'Name all 4th gen groups',
    slug: 'name-all-4th-gen-groups',
    groupSlug: 'general-kpop',
    game_type: 'name_all_groups',
    sub_type: 'gen_groups',
    timer: 120,
    difficulty: 'medium',
    items: [
      { name: 'Stray Kids', aliases: ['skz'] },
      { name: 'ATEEZ', aliases: ['atz'] },
      { name: 'TXT', aliases: ['tomorrow x together'] },
      { name: 'ENHYPEN', aliases: ['enha'] },
      { name: 'aespa', aliases: [] },
      { name: 'IVE', aliases: [] },
      { name: 'NewJeans', aliases: ['nj', 'new jeans'] },
      { name: 'LE SSERAFIM', aliases: ['lsfm', 'lesserafim'] },
      { name: 'ITZY', aliases: [] },
      { name: '(G)I-DLE', aliases: ['gidle', 'idle', 'g idle'] },
      { name: 'NMIXX', aliases: [] },
      { name: 'TREASURE', aliases: [] },
      { name: 'Kep1er', aliases: ['kepler'] },
      { name: 'STAYC', aliases: [] },
      { name: 'NCT Dream', aliases: ['dream'] },
      { name: 'RIIZE', aliases: [] },
    ],
  },
  {
    title: 'Name all 3rd gen groups',
    slug: 'name-all-3rd-gen-groups',
    groupSlug: 'general-kpop',
    game_type: 'name_all_groups',
    sub_type: 'gen_groups',
    timer: 180,
    difficulty: 'hard',
    items: [
      { name: 'BTS', aliases: ['bangtan'] },
      { name: 'BLACKPINK', aliases: ['bp'] },
      { name: 'TWICE', aliases: [] },
      { name: 'EXO', aliases: [] },
      { name: 'SEVENTEEN', aliases: ['svt'] },
      { name: 'Red Velvet', aliases: ['rv'] },
      { name: 'GOT7', aliases: [] },
      { name: 'MAMAMOO', aliases: ['mmm'] },
      { name: 'MONSTA X', aliases: ['mx'] },
      { name: 'NCT 127', aliases: ['nct127'] },
      { name: 'GFRIEND', aliases: ['girlfriend'] },
      { name: 'ASTRO', aliases: [] },
      { name: 'Dreamcatcher', aliases: ['dc'] },
      { name: 'BTOB', aliases: [] },
      { name: 'Wanna One', aliases: ['wannaone'] },
      { name: 'iKON', aliases: [] },
      { name: 'WINNER', aliases: [] },
      { name: 'Oh My Girl', aliases: ['omg', 'ohmygirl'] },
      { name: 'Lovelyz', aliases: [] },
      { name: 'DAY6', aliases: [] },
    ],
  },
  {
    title: 'Name all 2nd gen groups',
    slug: 'name-all-2nd-gen-groups',
    groupSlug: 'general-kpop',
    game_type: 'name_all_groups',
    sub_type: 'gen_groups',
    timer: 120,
    difficulty: 'easy',
    items: [
      { name: "Girls' Generation", aliases: ['snsd', 'soshi', 'girls generation'] },
      { name: 'SHINee', aliases: [] },
      { name: 'Super Junior', aliases: ['suju', 'sj'] },
      { name: 'BIGBANG', aliases: ['big bang', 'bb'] },
      { name: '2NE1', aliases: [] },
      { name: 'f(x)', aliases: ['fx'] },
      { name: '2PM', aliases: [] },
      { name: 'Wonder Girls', aliases: [] },
      { name: 'BEAST', aliases: ['beast', 'highlight'] },
      { name: 'T-ARA', aliases: ['tara', 't ara'] },
      { name: 'INFINITE', aliases: [] },
      { name: 'SISTAR', aliases: [] },
    ],
  },
  {
    title: 'Name all 4th gen girl groups',
    slug: 'name-all-4th-gen-gg',
    groupSlug: 'general-kpop',
    game_type: 'name_all_groups',
    sub_type: 'gen_groups',
    timer: 90,
    difficulty: 'easy',
    items: [
      { name: 'aespa', aliases: [] },
      { name: 'IVE', aliases: [] },
      { name: 'NewJeans', aliases: ['nj', 'new jeans'] },
      { name: 'LE SSERAFIM', aliases: ['lsfm', 'lesserafim'] },
      { name: 'ITZY', aliases: [] },
      { name: '(G)I-DLE', aliases: ['gidle', 'idle'] },
      { name: 'NMIXX', aliases: [] },
      { name: 'Kep1er', aliases: ['kepler'] },
      { name: 'STAYC', aliases: [] },
      { name: 'BABYMONSTER', aliases: ['bm'] },
    ],
  },
  {
    title: 'Name all 4th gen boy groups',
    slug: 'name-all-4th-gen-bg',
    groupSlug: 'general-kpop',
    game_type: 'name_all_groups',
    sub_type: 'gen_groups',
    timer: 90,
    difficulty: 'easy',
    items: [
      { name: 'Stray Kids', aliases: ['skz'] },
      { name: 'ATEEZ', aliases: ['atz'] },
      { name: 'TXT', aliases: ['tomorrow x together'] },
      { name: 'ENHYPEN', aliases: ['enha'] },
      { name: 'TREASURE', aliases: [] },
      { name: 'NCT Dream', aliases: ['dream'] },
      { name: 'RIIZE', aliases: [] },
      { name: 'BOYNEXTDOOR', aliases: ['bnd'] },
      { name: 'ZEROBASEONE', aliases: ['zb1'] },
      { name: 'TEMPEST', aliases: [] },
    ],
  },

  // -------------------------------------------------------
  // Idol naming (name_all_idols)
  // -------------------------------------------------------
  {
    title: 'Name 20 girl group idols',
    slug: 'name-20-gg-idols',
    groupSlug: 'general-kpop',
    game_type: 'name_all_idols',
    sub_type: 'girl_idols',
    timer: 180,
    difficulty: 'medium',
    items: [
      { name: 'Jennie', aliases: [], group: 'BLACKPINK' },
      { name: 'Lisa', aliases: [], group: 'BLACKPINK' },
      { name: 'Karina', aliases: [], group: 'aespa' },
      { name: 'Winter', aliases: [], group: 'aespa' },
      { name: 'Wonyoung', aliases: [], group: 'IVE' },
      { name: 'Minji', aliases: [], group: 'NewJeans' },
      { name: 'Hanni', aliases: [], group: 'NewJeans' },
      { name: 'Chaewon', aliases: [], group: 'LE SSERAFIM' },
      { name: 'Nayeon', aliases: [], group: 'TWICE' },
      { name: 'Yeji', aliases: [], group: 'ITZY' },
      { name: 'Ryujin', aliases: [], group: 'ITZY' },
      { name: 'Soyeon', aliases: [], group: '(G)I-DLE' },
      { name: 'Irene', aliases: [], group: 'Red Velvet' },
      { name: 'Hwasa', aliases: [], group: 'MAMAMOO' },
      { name: 'Rose', aliases: [], group: 'BLACKPINK' },
      { name: 'Sakura', aliases: [], group: 'LE SSERAFIM' },
      { name: 'Danielle', aliases: [], group: 'NewJeans' },
      { name: 'Yujin', aliases: [], group: 'IVE' },
      { name: 'Sana', aliases: [], group: 'TWICE' },
      { name: 'Ningning', aliases: [], group: 'aespa' },
    ],
  },
  {
    title: 'Name 30 boy group idols',
    slug: 'name-30-bg-idols',
    groupSlug: 'general-kpop',
    game_type: 'name_all_idols',
    sub_type: 'boy_idols',
    timer: 300,
    difficulty: 'hard',
    items: [
      { name: 'Jungkook', aliases: [], group: 'BTS' },
      { name: 'V', aliases: [], group: 'BTS' },
      { name: 'Jimin', aliases: [], group: 'BTS' },
      { name: 'RM', aliases: [], group: 'BTS' },
      { name: 'Suga', aliases: [], group: 'BTS' },
      { name: 'Felix', aliases: [], group: 'Stray Kids' },
      { name: 'Hyunjin', aliases: [], group: 'Stray Kids' },
      { name: 'Bang Chan', aliases: [], group: 'Stray Kids' },
      { name: 'Han', aliases: [], group: 'Stray Kids' },
      { name: 'Mingyu', aliases: [], group: 'SEVENTEEN' },
      { name: 'Hoshi', aliases: [], group: 'SEVENTEEN' },
      { name: 'Woozi', aliases: [], group: 'SEVENTEEN' },
      { name: 'San', aliases: [], group: 'ATEEZ' },
      { name: 'Hongjoong', aliases: [], group: 'ATEEZ' },
      { name: 'Yeonjun', aliases: [], group: 'TXT' },
      { name: 'Soobin', aliases: [], group: 'TXT' },
      { name: 'Heeseung', aliases: [], group: 'ENHYPEN' },
      { name: 'Jake', aliases: [], group: 'ENHYPEN' },
      { name: 'Sunghoon', aliases: [], group: 'ENHYPEN' },
      { name: 'Taeyong', aliases: [], group: 'NCT 127' },
      { name: 'Mark', aliases: [], group: 'NCT 127' },
      { name: 'Baekhyun', aliases: [], group: 'EXO' },
      { name: 'Kai', aliases: [], group: 'EXO' },
      { name: 'Taemin', aliases: [], group: 'SHINee' },
      { name: 'Jackson', aliases: [], group: 'GOT7' },
      { name: 'Wooyoung', aliases: [], group: 'ATEEZ' },
      { name: 'Lee Know', aliases: [], group: 'Stray Kids' },
      { name: 'Beomgyu', aliases: [], group: 'TXT' },
      { name: 'Seungkwan', aliases: [], group: 'SEVENTEEN' },
      { name: 'Changbin', aliases: [], group: 'Stray Kids' },
    ],
  },
  {
    title: 'Name 15 4th gen girl idols',
    slug: 'name-15-4th-gen-gg-idols',
    groupSlug: 'general-kpop',
    game_type: 'name_all_idols',
    sub_type: 'girl_idols',
    timer: 150,
    difficulty: 'medium',
    items: [
      { name: 'Karina', aliases: [], group: 'aespa' },
      { name: 'Winter', aliases: [], group: 'aespa' },
      { name: 'Wonyoung', aliases: [], group: 'IVE' },
      { name: 'Minji', aliases: [], group: 'NewJeans' },
      { name: 'Hanni', aliases: [], group: 'NewJeans' },
      { name: 'Chaewon', aliases: [], group: 'LE SSERAFIM' },
      { name: 'Kazuha', aliases: [], group: 'LE SSERAFIM' },
      { name: 'Yeji', aliases: [], group: 'ITZY' },
      { name: 'Ryujin', aliases: [], group: 'ITZY' },
      { name: 'Soyeon', aliases: [], group: '(G)I-DLE' },
      { name: 'Yujin', aliases: [], group: 'IVE' },
      { name: 'Danielle', aliases: [], group: 'NewJeans' },
      { name: 'Sakura', aliases: [], group: 'LE SSERAFIM' },
      { name: 'Lily', aliases: [], group: 'NMIXX' },
      { name: 'Haerin', aliases: [], group: 'NewJeans' },
    ],
  },
  {
    title: 'Name 15 4th gen boy idols',
    slug: 'name-15-4th-gen-bg-idols',
    groupSlug: 'general-kpop',
    game_type: 'name_all_idols',
    sub_type: 'boy_idols',
    timer: 150,
    difficulty: 'medium',
    items: [
      { name: 'Felix', aliases: [], group: 'Stray Kids' },
      { name: 'Hyunjin', aliases: [], group: 'Stray Kids' },
      { name: 'San', aliases: [], group: 'ATEEZ' },
      { name: 'Yeonjun', aliases: [], group: 'TXT' },
      { name: 'Heeseung', aliases: [], group: 'ENHYPEN' },
      { name: 'Jake', aliases: [], group: 'ENHYPEN' },
      { name: 'Bang Chan', aliases: [], group: 'Stray Kids' },
      { name: 'Hongjoong', aliases: [], group: 'ATEEZ' },
      { name: 'Soobin', aliases: [], group: 'TXT' },
      { name: 'Sunghoon', aliases: [], group: 'ENHYPEN' },
      { name: 'Wooyoung', aliases: [], group: 'ATEEZ' },
      { name: 'Han', aliases: [], group: 'Stray Kids' },
      { name: 'Beomgyu', aliases: [], group: 'TXT' },
      { name: 'Jungwon', aliases: [], group: 'ENHYPEN' },
      { name: 'Changbin', aliases: [], group: 'Stray Kids' },
    ],
  },

  // -------------------------------------------------------
  // Album songs (name_all_songs / album_songs)
  // -------------------------------------------------------
  {
    title: 'Name all songs from Map of the Soul: 7',
    slug: 'name-songs-mots7',
    groupSlug: 'bts',
    game_type: 'name_all_songs',
    sub_type: 'album_songs',
    timer: 120,
    difficulty: 'medium',
    album: 'Map of the Soul: 7',
    artist: 'BTS',
    items: [
      { name: 'Interlude: Shadow', aliases: ['shadow'] },
      { name: 'Black Swan', aliases: [] },
      { name: 'Filter', aliases: [] },
      { name: 'My Time', aliases: [] },
      { name: 'Louder than bombs', aliases: [] },
      { name: 'ON', aliases: [] },
      { name: 'UGH!', aliases: ['ugh'] },
      { name: '00:00', aliases: ['zero o clock', 'zero oclock'] },
      { name: 'Inner Child', aliases: [] },
      { name: 'Friends', aliases: [] },
      { name: 'Moon', aliases: [] },
      { name: 'Respect', aliases: [] },
      { name: 'We are Bulletproof: the Eternal', aliases: ['we are bulletproof', 'bulletproof eternal'] },
      { name: 'Outro: Ego', aliases: ['ego'] },
      { name: 'Boy With Luv', aliases: [] },
      { name: 'Make It Right', aliases: [] },
      { name: 'Dionysus', aliases: [] },
      { name: 'Jamais Vu', aliases: [] },
      { name: 'HOME', aliases: [] },
      { name: 'Mikrokosmos', aliases: [] },
    ],
  },
  {
    title: 'Name all songs from THE ALBUM',
    slug: 'name-songs-the-album-bp',
    groupSlug: 'blackpink',
    game_type: 'name_all_songs',
    sub_type: 'album_songs',
    timer: 60,
    difficulty: 'easy',
    album: 'THE ALBUM',
    artist: 'BLACKPINK',
    items: [
      { name: 'How You Like That', aliases: ['hylt'] },
      { name: 'Ice Cream', aliases: [] },
      { name: 'Pretty Savage', aliases: [] },
      { name: 'Bet You Wanna', aliases: [] },
      { name: 'Lovesick Girls', aliases: ['lsg'] },
      { name: 'Crazy Over You', aliases: [] },
      { name: 'Love To Hate Me', aliases: [] },
      { name: 'You Never Know', aliases: [] },
    ],
  },
  {
    title: 'Name all songs from BORN PINK',
    slug: 'name-songs-born-pink',
    groupSlug: 'blackpink',
    game_type: 'name_all_songs',
    sub_type: 'album_songs',
    timer: 60,
    difficulty: 'easy',
    album: 'BORN PINK',
    artist: 'BLACKPINK',
    items: [
      { name: 'Pink Venom', aliases: [] },
      { name: 'Shut Down', aliases: [] },
      { name: 'Typa Girl', aliases: [] },
      { name: 'Yeah Yeah Yeah', aliases: [] },
      { name: 'Hard to Love', aliases: [] },
      { name: 'The Happiest Girl', aliases: [] },
      { name: 'Tally', aliases: [] },
      { name: 'Ready for Love', aliases: [] },
    ],
  },
  {
    title: 'Name all songs from ODDINARY',
    slug: 'name-songs-oddinary',
    groupSlug: 'stray-kids',
    game_type: 'name_all_songs',
    sub_type: 'album_songs',
    timer: 180,
    difficulty: 'hard',
    album: 'ODDINARY',
    artist: 'Stray Kids',
    items: [
      { name: 'VENOM', aliases: [] },
      { name: 'MANIAC', aliases: [] },
      { name: 'Charmer', aliases: [] },
      { name: 'Freeze', aliases: [] },
      { name: 'Lonely St.', aliases: ['lonely street', 'lonely st'] },
      { name: 'Waiting for Us', aliases: [] },
      { name: 'Muddy Water', aliases: [] },
    ],
  },
  {
    title: 'Name all songs from FML',
    slug: 'name-songs-fml',
    groupSlug: 'seventeen',
    game_type: 'name_all_songs',
    sub_type: 'album_songs',
    timer: 240,
    difficulty: 'hard',
    album: 'FML',
    artist: 'SEVENTEEN',
    items: [
      { name: 'F*ck My Life', aliases: ['fml', 'fuck my life'] },
      { name: 'Super', aliases: [] },
      { name: 'Dust', aliases: [] },
      { name: 'I dont understand but I luv u', aliases: ['i dont understand'] },
      { name: 'April shower', aliases: [] },
      { name: 'Fml intro', aliases: ['intro'] },
      { name: 'Fire', aliases: [] },
      { name: 'SOS', aliases: [] },
      { name: 'Unforgiven', aliases: [] },
      { name: 'Wedding Day', aliases: [] },
      { name: 'MMM', aliases: ['mmm'] },
      { name: 'Ash', aliases: [] },
      { name: 'Spell', aliases: [] },
    ],
  },
  {
    title: 'Name all songs from MY WORLD',
    slug: 'name-songs-my-world-aespa',
    groupSlug: 'aespa',
    game_type: 'name_all_songs',
    sub_type: 'album_songs',
    timer: 60,
    difficulty: 'easy',
    album: 'MY WORLD',
    artist: 'aespa',
    items: [
      { name: 'Spicy', aliases: [] },
      { name: 'Salty & Sweet', aliases: ['salty and sweet'] },
      { name: 'Thirsty', aliases: [] },
      { name: 'Til We Meet Again', aliases: ['til we meet again'] },
      { name: "Im Unhappy", aliases: ['im unhappy'] },
      { name: 'YOLO', aliases: [] },
    ],
  },
  {
    title: "Name all songs from I've IVE",
    slug: 'name-songs-ive-ive',
    groupSlug: 'ive',
    game_type: 'name_all_songs',
    sub_type: 'album_songs',
    timer: 90,
    difficulty: 'medium',
    album: "I've IVE",
    artist: 'IVE',
    items: [
      { name: 'I AM', aliases: [] },
      { name: 'Kitsch', aliases: [] },
      { name: 'ELEVEN', aliases: [] },
      { name: 'LOVE DIVE', aliases: [] },
      { name: 'After LIKE', aliases: [] },
      { name: 'Blue Blood', aliases: [] },
      { name: 'Lips', aliases: [] },
      { name: 'Baddie', aliases: [] },
    ],
  },
  {
    title: 'Name all songs from MAXIDENT',
    slug: 'name-songs-maxident',
    groupSlug: 'stray-kids',
    game_type: 'name_all_songs',
    sub_type: 'album_songs',
    timer: 90,
    difficulty: 'medium',
    album: 'MAXIDENT',
    artist: 'Stray Kids',
    items: [
      { name: 'CASE 143', aliases: ['case143'] },
      { name: 'Chill', aliases: [] },
      { name: 'Give Me Your TMI', aliases: ['tmi'] },
      { name: 'Super Board', aliases: [] },
      { name: "Cant Stop", aliases: ['cant stop'] },
      { name: '3RACHA', aliases: ['3racha'] },
      { name: 'Taste', aliases: [] },
      { name: 'Circus', aliases: [] },
    ],
  },

  // -------------------------------------------------------
  // Top hits (name_top_songs / top_hits)
  // -------------------------------------------------------
  {
    title: 'Name top 10 BLACKPINK songs',
    slug: 'name-top-10-blackpink-songs',
    groupSlug: 'blackpink',
    game_type: 'name_top_songs',
    sub_type: 'top_hits',
    timer: 90,
    difficulty: 'easy',
    artist: 'BLACKPINK',
    items: [
      { name: 'DDU-DU DDU-DU', aliases: ['ddu du ddu du', 'dddd'] },
      { name: 'How You Like That', aliases: ['hylt'] },
      { name: 'Kill This Love', aliases: ['ktl'] },
      { name: 'Lovesick Girls', aliases: ['lsg'] },
      { name: 'Pink Venom', aliases: [] },
      { name: 'Shut Down', aliases: [] },
      { name: 'Boombayah', aliases: [] },
      { name: "As If Its Your Last", aliases: ['aiiyl'] },
      { name: 'Playing With Fire', aliases: ['pwf'] },
      { name: 'Whistle', aliases: [] },
    ],
  },
  {
    title: 'Name top 10 BTS songs',
    slug: 'name-top-10-bts-songs',
    groupSlug: 'bts',
    game_type: 'name_top_songs',
    sub_type: 'top_hits',
    timer: 90,
    difficulty: 'easy',
    artist: 'BTS',
    items: [
      { name: 'Dynamite', aliases: [] },
      { name: 'Butter', aliases: [] },
      { name: 'Boy With Luv', aliases: ['bwl'] },
      { name: 'Spring Day', aliases: [] },
      { name: 'Fake Love', aliases: [] },
      { name: 'DNA', aliases: [] },
      { name: 'Blood Sweat & Tears', aliases: ['bst', 'blood sweat and tears'] },
      { name: 'IDOL', aliases: [] },
      { name: 'Fire', aliases: [] },
      { name: 'MIC Drop', aliases: ['mic drop'] },
    ],
  },
  {
    title: 'Name top 5 aespa songs',
    slug: 'name-top-5-aespa-songs',
    groupSlug: 'aespa',
    game_type: 'name_top_songs',
    sub_type: 'top_hits',
    timer: 60,
    difficulty: 'easy',
    artist: 'aespa',
    items: [
      { name: 'Next Level', aliases: [] },
      { name: 'Supernova', aliases: [] },
      { name: 'Savage', aliases: [] },
      { name: 'Black Mamba', aliases: [] },
      { name: 'Spicy', aliases: [] },
    ],
  },
  {
    title: 'Name top 10 Stray Kids songs',
    slug: 'name-top-10-skz-songs',
    groupSlug: 'stray-kids',
    game_type: 'name_top_songs',
    sub_type: 'top_hits',
    timer: 120,
    difficulty: 'medium',
    artist: 'Stray Kids',
    items: [
      { name: 'Gods Menu', aliases: ['gods menu'] },
      { name: 'MANIAC', aliases: [] },
      { name: 'Back Door', aliases: ['backdoor'] },
      { name: 'Thunderous', aliases: ['sonari'] },
      { name: 'MIROH', aliases: [] },
      { name: 'District 9', aliases: [] },
      { name: 'My Pace', aliases: [] },
      { name: 'CASE 143', aliases: [] },
      { name: 'S-Class', aliases: ['s class', 'sclass'] },
      { name: 'Hellevator', aliases: [] },
    ],
  },
  {
    title: 'Name top 10 TWICE songs',
    slug: 'name-top-10-twice-songs',
    groupSlug: 'twice',
    game_type: 'name_top_songs',
    sub_type: 'top_hits',
    timer: 120,
    difficulty: 'medium',
    artist: 'TWICE',
    items: [
      { name: 'Cheer Up', aliases: [] },
      { name: 'TT', aliases: [] },
      { name: 'Fancy', aliases: [] },
      { name: 'What is Love?', aliases: ['what is love', 'wil'] },
      { name: 'Feel Special', aliases: [] },
      { name: 'Like Ooh-Ahh', aliases: ['like ooh ahh', 'loa'] },
      { name: 'LIKEY', aliases: [] },
      { name: 'Dance The Night Away', aliases: ['dtna'] },
      { name: 'YES or YES', aliases: [] },
      { name: 'I CANT STOP ME', aliases: ['i cant stop me', 'icsm'] },
    ],
  },
  {
    title: 'Name top 5 NewJeans songs',
    slug: 'name-top-5-newjeans-songs',
    groupSlug: 'newjeans',
    game_type: 'name_top_songs',
    sub_type: 'top_hits',
    timer: 45,
    difficulty: 'easy',
    artist: 'NewJeans',
    items: [
      { name: 'Hype Boy', aliases: [] },
      { name: 'Super Shy', aliases: [] },
      { name: 'Ditto', aliases: [] },
      { name: 'Attention', aliases: [] },
      { name: 'OMG', aliases: [] },
    ],
  },
  {
    title: 'Name top 10 SEVENTEEN songs',
    slug: 'name-top-10-svt-songs',
    groupSlug: 'seventeen',
    game_type: 'name_top_songs',
    sub_type: 'top_hits',
    timer: 120,
    difficulty: 'hard',
    artist: 'SEVENTEEN',
    items: [
      { name: 'Dont Wanna Cry', aliases: ['dont wanna cry', 'dwc'] },
      { name: 'Super', aliases: [] },
      { name: 'Very Nice', aliases: ['aju nice'] },
      { name: 'MAESTRO', aliases: [] },
      { name: 'HOT', aliases: [] },
      { name: 'Left & Right', aliases: ['left and right'] },
      { name: 'THANKS', aliases: [] },
      { name: 'Adore U', aliases: [] },
      { name: 'HIT', aliases: [] },
      { name: 'Oh My!', aliases: ['oh my'] },
    ],
  },
  {
    title: 'Name top 10 4th gen girl group songs',
    slug: 'name-top-10-4th-gen-gg-songs',
    groupSlug: 'general-kpop',
    game_type: 'name_top_songs',
    sub_type: 'top_hits',
    timer: 150,
    difficulty: 'hard',
    items: [
      { name: 'Next Level', aliases: [], artist: 'aespa' },
      { name: 'Supernova', aliases: [], artist: 'aespa' },
      { name: 'LOVE DIVE', aliases: [], artist: 'IVE' },
      { name: 'I AM', aliases: [], artist: 'IVE' },
      { name: 'Hype Boy', aliases: [], artist: 'NewJeans' },
      { name: 'Super Shy', aliases: [], artist: 'NewJeans' },
      { name: 'FEARLESS', aliases: [], artist: 'LE SSERAFIM' },
      { name: 'DALLA DALLA', aliases: [], artist: 'ITZY' },
      { name: 'TOMBOY', aliases: [], artist: '(G)I-DLE' },
      { name: 'Queencard', aliases: ['queen card'], artist: '(G)I-DLE' },
    ],
  },
  {
    title: 'Name top 10 4th gen boy group songs',
    slug: 'name-top-10-4th-gen-bg-songs',
    groupSlug: 'general-kpop',
    game_type: 'name_top_songs',
    sub_type: 'top_hits',
    timer: 150,
    difficulty: 'hard',
    items: [
      { name: 'Gods Menu', aliases: [], artist: 'Stray Kids' },
      { name: 'MANIAC', aliases: [], artist: 'Stray Kids' },
      { name: 'Thunderous', aliases: [], artist: 'Stray Kids' },
      { name: 'Crown', aliases: [], artist: 'TXT' },
      { name: 'Anti-Romantic', aliases: ['anti romantic'], artist: 'TXT' },
      { name: 'Given-Taken', aliases: ['given taken'], artist: 'ENHYPEN' },
      { name: 'Bite Me', aliases: [], artist: 'ENHYPEN' },
      { name: 'Guerrilla', aliases: [], artist: 'ATEEZ' },
      { name: 'BOUNCY', aliases: [], artist: 'ATEEZ' },
      { name: 'Super', aliases: [], artist: 'SEVENTEEN' },
    ],
  },
];

// ============================================================
// New game_type values used by this script
// ============================================================

const EXPANDED_GAME_TYPES: GameType[] = [
  'name_all_groups',
  'name_all_idols',
  'name_all_songs',
  'name_top_songs',
];

// ============================================================
// Main seed function
// ============================================================

async function main() {
  const isClean = process.argv.includes('--clean');

  if (isClean) {
    console.log('Cleaning previous expanded games...');
    for (const gt of EXPANDED_GAME_TYPES) {
      const { data: existing } = await supabase
        .from('games')
        .select('id')
        .eq('game_type', gt);
      const ids = (existing ?? []).map(g => g.id);
      if (ids.length > 0) {
        await supabase.from('game_plays').delete().in('game_id', ids);
        await supabase.from('games').delete().in('id', ids);
        console.log(`  Cleaned ${ids.length} games with game_type="${gt}".`);
      } else {
        console.log(`  No games found with game_type="${gt}".`);
      }
    }
  }

  // Fetch group map
  const { data: groups } = await supabase.from('groups').select('id, slug');
  const groupMap = new Map<string, number>();
  for (const g of groups ?? []) groupMap.set(g.slug, g.id);

  // Get a creator ID (use first seed user or admin)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('username', ['kpophistory', 'admin'])
    .limit(1);
  const creatorId = profiles?.[0]?.id;
  if (!creatorId) {
    console.error('No creator found. Run the quiz seed first.');
    return;
  }

  console.log(`\nSeeding ${GAMES.length} expanded games...`);
  let inserted = 0;

  for (const game of GAMES) {
    const groupId = groupMap.get(game.groupSlug);
    if (!groupId) {
      console.error(`  Group "${game.groupSlug}" not found, skipping "${game.title}"`);
      continue;
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('slug', game.slug)
      .maybeSingle();
    if (existing) {
      console.log(`  "${game.title}" already exists, skipping.`);
      continue;
    }

    // Build content JSONB
    const content: Record<string, unknown> = {
      items: game.items.map(item => {
        const obj: Record<string, unknown> = {
          name: item.name,
          aliases: item.aliases,
        };
        if (item.group) {
          obj.group = item.group;
          const imgFile = IDOL_IMAGES[`${item.name}:${item.group}`];
          if (imgFile) obj.image_url = `/idols/${imgFile}`;
        } else if (game.game_type === 'name_all_groups') {
          const grpFile = GROUP_IMAGES[item.name];
          if (grpFile) obj.image_url = `/idols/${grpFile}`;
        }
        if (item.artist) obj.artist = item.artist;
        return obj;
      }),
      timer_seconds: game.timer,
      difficulty: game.difficulty,
    };

    if (game.album) content.album = game.album;
    if (game.artist) content.artist = game.artist;

    const insertData: Record<string, unknown> = {
      creator_id: creatorId,
      group_id: groupId,
      title: game.title,
      slug: game.slug,
      game_type: game.game_type,
      content,
      matchup_count: game.items.length,
      status: 'published',
      play_count: Math.floor(Math.random() * 81) + 20,
    };

    // Try with sub_type first, fall back without it if column doesn't exist
    let { error } = await supabase.from('games').insert({ ...insertData, sub_type: game.sub_type });
    if (error?.message?.includes('sub_type')) {
      console.log('  (sub_type column not found, inserting without it)');
      ({ error } = await supabase.from('games').insert(insertData));
    }

    if (error) {
      console.error(`  Failed "${game.title}": ${error.message}`);
      continue;
    }

    inserted++;
    console.log(`  [${inserted}] "${game.title}" (${game.game_type}/${game.sub_type}, ${game.items.length} items, ${game.timer}s, ${game.difficulty})`);
  }

  console.log(`\nSeeded ${inserted}/${GAMES.length} games.`);

  // Verification
  for (const gt of EXPANDED_GAME_TYPES) {
    const { count } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('game_type', gt)
      .eq('status', 'published');
    console.log(`Total "${gt}" games in DB: ${count}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
