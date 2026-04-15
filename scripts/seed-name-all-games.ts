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
// Member data for each group
// ============================================================

interface MemberDef {
  name: string;
  aliases: string[];
  position: string;
  color: string;
}

interface GameDef {
  title: string;
  slug: string;
  groupSlug: string;
  timer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  members: MemberDef[];
}

// Idol image filename lookup: key = "gameSlug:memberName" -> filename in public/idols/
const IDOL_PHOTOS: Record<string, string> = {
  // BTS
  'name-all-bts:RM': 'RM BTS.jpg',
  'name-all-bts:Jin': 'Jin BTS.jpg',
  'name-all-bts:Suga': 'Suga BTS.jpg',
  'name-all-bts:J-Hope': 'J-Hope BTS.jpg',
  'name-all-bts:Jimin': 'Jimin BTS.jpg',
  'name-all-bts:V': 'V BTS.jpg',
  'name-all-bts:Jungkook': 'Jungkook BTS.jpg',
  // BLACKPINK
  'name-all-blackpink:Jisoo': 'Jisoo BLACKPINK.jpg',
  'name-all-blackpink:Jennie': 'Jennie BLACKPINK.jpg',
  'name-all-blackpink:Rose': 'Rose BLACKPINK.jpg',
  'name-all-blackpink:Lisa': 'Lisa BLACKPINK.jpg',
  // TWICE
  'name-all-twice:Nayeon': 'Nayeon Twice.jpg',
  'name-all-twice:Jeongyeon': 'Jeongyeon Twice.jpg',
  'name-all-twice:Momo': 'Momo Twice.jpg',
  'name-all-twice:Sana': 'Sana Twice.jpg',
  'name-all-twice:Jihyo': 'Jihyo Twice.jpg',
  'name-all-twice:Mina': 'Mina Twice.jpg',
  'name-all-twice:Dahyun': 'Dahyun TWICE.jpg',
  'name-all-twice:Chaeyoung': 'Chaeyoung Twice.jpg',
  'name-all-twice:Tzuyu': 'Tzuyu Twice.jpg',
  // Stray Kids
  'name-all-stray-kids:Bang Chan': 'Bang Chan STRYKIDS.jpg',
  'name-all-stray-kids:Lee Know': 'Lee Know STAYKIDS.jpg',
  'name-all-stray-kids:Changbin': 'Changbin STRAYKIDS.jpg',
  'name-all-stray-kids:Hyunjin': 'Hyunjin STRAYKIDS.jpg',
  'name-all-stray-kids:Han': 'Han STRAYKIDS.jpg',
  'name-all-stray-kids:Felix': 'Felix STRAYKIDS.jpg',
  'name-all-stray-kids:Seungmin': 'Seungmin STRAYKIDS.jpg',
  'name-all-stray-kids:I.N': 'I.N stray kids.jpg',
  // SEVENTEEN
  'name-all-seventeen:S.Coups': 'S.Coups SEVENTEEN.jpg',
  'name-all-seventeen:Jeonghan': 'Jeonghan SEVENTEEN.jpg',
  'name-all-seventeen:Joshua': 'Joshua SEVENTEEN.jpg',
  'name-all-seventeen:Jun': 'Jun SEVENTEEN.jpg',
  'name-all-seventeen:Hoshi': 'Hoshi SEVENTEEN.jpg',
  'name-all-seventeen:Wonwoo': 'Wonwoo SEVENTEEN.jpg',
  'name-all-seventeen:Woozi': 'Woozi SEVENTEEN.jpg',
  'name-all-seventeen:DK': 'DK SEVENTEEN.jpg',
  'name-all-seventeen:Mingyu': 'Mingyu SEVENTEEN.jpg',
  'name-all-seventeen:The8': 'The8 SEVENTEEN.jpg',
  'name-all-seventeen:Seungkwan': 'Seungkwan SEVENTEEN.jpg',
  'name-all-seventeen:Vernon': 'Vernon SEVENTEEN.jpg',
  'name-all-seventeen:Dino': 'Dino SEVENTEEN.jpg',
  // aespa
  'name-all-aespa:Karina': 'Karina AESPA.jpg',
  'name-all-aespa:Giselle': 'Giselle AESPA.jpg',
  'name-all-aespa:Winter': 'Winter AESPA.jpg',
  'name-all-aespa:Ningning': 'Ningning AESPA.jpg',
  // NewJeans
  'name-all-newjeans:Minji': 'Minji NEWJEANS.jpg',
  'name-all-newjeans:Hanni': 'Hanni NEWJEANS.jpg',
  'name-all-newjeans:Danielle': 'Danielle NEWJEANS.jpg',
  'name-all-newjeans:Haerin': 'Haerin NEWJEANS.jpg',
  'name-all-newjeans:Hyein': 'Hyein NEWJEANS.jpg',
  // IVE
  'name-all-ive:Yujin': 'Yujin IVE.jpg',
  'name-all-ive:Gaeul': 'Gaeul IVE.jpg',
  'name-all-ive:Rei': 'Rei IVE.jpg',
  'name-all-ive:Wonyoung': 'Wonyoung IVE.jpg',
  'name-all-ive:Liz': 'Liz IVE.jpg',
  'name-all-ive:Leeseo': 'Leeseo IVE.jpg',
  // LE SSERAFIM
  'name-all-le-sserafim:Sakura': 'Sakura LESSERAFIM.jpg',
  'name-all-le-sserafim:Chaewon': 'Chaewon LESSERAFIM.jpg',
  'name-all-le-sserafim:Yunjin': 'Yunjin LESSERAFIM.jpg',
  'name-all-le-sserafim:Kazuha': 'Kazuha LESSERAFIM.jpg',
  'name-all-le-sserafim:Eunchae': 'Eunchae LESSERAFIM.jpg',
  // EXO
  'name-all-exo:Xiumin': 'Xiumin EXO.jpg',
  'name-all-exo:Suho': 'Suho EXO.jpg',
  'name-all-exo:Lay': 'Lay EXO.jpg',
  'name-all-exo:Baekhyun': 'Baekhyun EXO.jpg',
  'name-all-exo:Chen': 'Chen EXO.jpg',
  'name-all-exo:Chanyeol': 'Chanyeol EXO.jpg',
  'name-all-exo:D.O.': 'D.O. EXO.jpg',
  'name-all-exo:Kai': 'Kai EXO.jpg',
  'name-all-exo:Sehun': 'Sehun EXO.jpg',
  // ENHYPEN
  'name-all-enhypen:Heeseung': 'Heeseung ENHYPEN.jpg',
  'name-all-enhypen:Jay': 'Jay ENHYPEN.jpg',
  'name-all-enhypen:Jake': 'Jake ENHYPEN.jpg',
  'name-all-enhypen:Sunghoon': 'Sunghoon ENHYPEN.jpg',
  'name-all-enhypen:Sunoo': 'Sunoo ENHYPEN.jpg',
  'name-all-enhypen:Jungwon': 'Jungwon ENHYPEN.jpg',
  'name-all-enhypen:Ni-ki': 'Ni-ki ENHYPEN.jpg',
  // TXT
  'name-all-txt:Soobin': 'Soobin TXT.jpg',
  'name-all-txt:Yeonjun': 'Yeonjun TXT.jpg',
  'name-all-txt:Beomgyu': 'Beomgyu TXT.jpg',
  'name-all-txt:Taehyun': 'Taehyun TXT.jpg',
  'name-all-txt:Huening Kai': 'Huening Kai TXT.jpg',
  // ATEEZ
  'name-all-ateez:Hongjoong': 'Hongjoong ATEEZ.jpg',
  'name-all-ateez:Seonghwa': 'Seonghwa ATEEZ.jpg',
  'name-all-ateez:Yunho': 'Yunho ATEEZ.jpg',
  'name-all-ateez:Yeosang': 'Yeosang ATEEZ.jpg',
  'name-all-ateez:San': 'San ATEEZ.jpg',
  'name-all-ateez:Mingi': 'Mingi ATEEZ.jpg',
  'name-all-ateez:Wooyoung': 'Wooyoung ATEEZ.jpg',
  'name-all-ateez:Jongho': 'Jongho ATEEZ.jpg',
  // Red Velvet
  'name-all-red-velvet:Irene': 'Irene REDVELVET.jpg',
  'name-all-red-velvet:Seulgi': 'Seulgi REDVELVET.jpg',
  'name-all-red-velvet:Wendy': 'Wendy REDVELVET.jpg',
  'name-all-red-velvet:Joy': 'Joy REDVELVET.jpg',
  'name-all-red-velvet:Yeri': 'Yeri REDVELVET.jpg',
  // ITZY
  'name-all-itzy:Yeji': 'Yeji ITZY.jpg',
  'name-all-itzy:Lia': 'Lia ITZY.jpg',
  'name-all-itzy:Ryujin': 'Ryujin ITZY.jpg',
  'name-all-itzy:Chaeryeong': 'Chaeryeong ITZY.jpg',
  'name-all-itzy:Yuna': 'Yuna ITZY.jpg',
  // (G)I-DLE
  'name-all-gidle:Miyeon': 'Miyeon G-idle.jpg',
  'name-all-gidle:Minnie': 'Minnie G-IDLE.jpg',
  'name-all-gidle:Soyeon': 'Soyeon G-IDLE.jpg',
  'name-all-gidle:Yuqi': 'Yuqi G-IDLE.jpg',
  'name-all-gidle:Shuhua': 'Shuhua G-IDLE.jpg',
  // NCT 127
  'name-all-nct-127:Taeyong': 'Taeyong NCT 127.jpg',
  'name-all-nct-127:Taeil': 'Taeil NCT 127.jpg',
  'name-all-nct-127:Johnny': 'Johnny NCT 127.jpg',
  'name-all-nct-127:Yuta': 'Yuta NCT 127.jpg',
  'name-all-nct-127:Doyoung': 'Doyoung NCT 127.jpg',
  'name-all-nct-127:Jaehyun': 'Jaehyun NCT 127.jpg',
  'name-all-nct-127:Jungwoo': 'Jungwoo NCT 127.jpg',
  'name-all-nct-127:Mark': 'Mark NCT 127.jpg',
  'name-all-nct-127:Haechan': 'Haechan NCT 127.jpg',
  // NCT Dream
  'name-all-nct-dream:Mark': 'Mark NCT DREAM.jpg',
  'name-all-nct-dream:Renjun': 'Renjun NCT DREAM.jpg',
  'name-all-nct-dream:Jeno': 'Jeno NCT DREAM.jpg',
  'name-all-nct-dream:Haechan': 'Haechan NCT DREAL.jpg',
  'name-all-nct-dream:Jaemin': 'Jaemin NCT DREAM.jpg',
  'name-all-nct-dream:Chenle': 'Chenle NCT DREAM.jpg',
  'name-all-nct-dream:Jisung': 'Jisung NCT DREAM.jpg',
  // SHINee
  'name-all-shinee:Onew': 'Onew SHINEE.jpg',
  'name-all-shinee:Key': 'Key SHINee.jpg',
  'name-all-shinee:Minho': 'Minho SHINee.jpg',
  'name-all-shinee:Taemin': 'Taemin SHINee.jpg',
  // NMIXX
  'name-all-nmixx:Lily': 'Lily NMIXX.jpg',
  'name-all-nmixx:Haewon': 'Haewon NMIXX.jpg',
  'name-all-nmixx:Sullyoon': 'Sullyoon NMIXX.jpg',
  'name-all-nmixx:Bae': 'Bae NMIXX.jpg',
  'name-all-nmixx:Jiwoo': 'Jiwoo NMIXX.jpg',
  'name-all-nmixx:Kyujin': 'Kyujin NMIXX.jpg',
  // GOT7
  'name-all-got7:JB': 'JB GOT7.jpg',
  'name-all-got7:Mark': 'Mark GOT7.jpg',
  'name-all-got7:Jackson': 'Jackson GOT7.jpg',
  'name-all-got7:Jinyoung': 'Jinyoung GOT7.jpg',
  'name-all-got7:Youngjae': 'Youngjae GOT7.jpg',
  'name-all-got7:BamBam': 'BamBam GOT7.jpg',
  'name-all-got7:Yugyeom': 'Yugyeom GOT7.jpg',
  // MAMAMOO
  'name-all-mamamoo:Solar': 'Solar MAMAMOO.jpg',
  'name-all-mamamoo:Moonbyul': 'Moonbyul MAMAMOO.jpg',
  'name-all-mamamoo:Wheein': 'Wheein MAMAMOO.jpg',
  'name-all-mamamoo:Hwasa': 'Hwasa MAMAMOO.jpg',
  // TREASURE
  'name-all-treasure:Hyunsuk': 'Hyunsuk Treasure.jpg',
  'name-all-treasure:Jihoon': 'Jihoon Treasure.jpg',
  'name-all-treasure:Yoshi': 'Yoshi Trasure.jpg',
  'name-all-treasure:Junkyu': 'Junkyu Treasure.jpg',
  'name-all-treasure:Mashiho': 'Mashiho Treasure.jpg',
  'name-all-treasure:Jaehyuk': 'Jaehyuk Treasure.jpg',
  'name-all-treasure:Asahi': 'Asahi Treasure.jpg',
  'name-all-treasure:Yedam': 'Yedam Treasure.jpg',
  'name-all-treasure:Doyoung': 'Doyoung Treasure.jpg',
  'name-all-treasure:Haruto': 'Haruto Treasure.jpg',
  // BABYMONSTER
  'name-all-babymonster:Ruka': 'Ruka BABYMONSTER.jpg',
  'name-all-babymonster:Pharita': 'Pharita BABYMONSTER.jpg',
  'name-all-babymonster:Asa': 'Asa BABYMONSTER.jpg',
  'name-all-babymonster:Ahyeon': 'Ahyeon BABYMONSTER.jpg',
  'name-all-babymonster:Rami': 'Rami BABYMONSTER.jpg',
  'name-all-babymonster:Chiquita': 'Chiquita BABYMONSTER.jpg',
  'name-all-babymonster:Haram': 'Haram BABYMONSTER.jpg',
};

const GAMES: GameDef[] = [
  {
    title: 'Name all BTS members',
    slug: 'name-all-bts',
    groupSlug: 'bts',
    timer: 60,
    difficulty: 'easy',
    members: [
      { name: 'RM', aliases: ['namjoon', 'kim namjoon', 'rap monster'], position: 'Leader, Main Rapper', color: '#378ADD' },
      { name: 'Jin', aliases: ['seokjin', 'kim seokjin'], position: 'Vocalist', color: '#E889B5' },
      { name: 'Suga', aliases: ['yoongi', 'min yoongi', 'agust d'], position: 'Lead Rapper', color: '#7F77DD' },
      { name: 'J-Hope', aliases: ['jhope', 'hoseok', 'jung hoseok'], position: 'Main Dancer, Rapper', color: '#E6A040' },
      { name: 'Jimin', aliases: ['park jimin'], position: 'Main Dancer, Vocalist', color: '#D4537E' },
      { name: 'V', aliases: ['taehyung', 'kim taehyung', 'tae'], position: 'Vocalist', color: '#0F6E56' },
      { name: 'Jungkook', aliases: ['jeon jungkook', 'jk'], position: 'Main Vocalist, Center', color: '#9B59B6' },
    ],
  },
  {
    title: 'Name all BLACKPINK members',
    slug: 'name-all-blackpink',
    groupSlug: 'blackpink',
    timer: 30,
    difficulty: 'easy',
    members: [
      { name: 'Jisoo', aliases: ['kim jisoo'], position: 'Vocalist, Visual', color: '#E84393' },
      { name: 'Jennie', aliases: ['jennie kim'], position: 'Main Rapper, Vocalist', color: '#2D3436' },
      { name: 'Rose', aliases: ['rosie', 'roseanne', 'park chaeyoung'], position: 'Main Vocalist', color: '#FDCB6E' },
      { name: 'Lisa', aliases: ['lalisa', 'lalisa manoban'], position: 'Main Dancer, Rapper', color: '#6C5CE7' },
    ],
  },
  {
    title: 'Name all TWICE members',
    slug: 'name-all-twice',
    groupSlug: 'twice',
    timer: 120,
    difficulty: 'medium',
    members: [
      { name: 'Nayeon', aliases: ['im nayeon'], position: 'Main Vocalist, Center', color: '#E84393' },
      { name: 'Jeongyeon', aliases: ['yoo jeongyeon'], position: 'Lead Vocalist', color: '#00B894' },
      { name: 'Momo', aliases: ['hirai momo'], position: 'Main Dancer', color: '#FDCB6E' },
      { name: 'Sana', aliases: ['minatozaki sana'], position: 'Vocalist', color: '#E17055' },
      { name: 'Jihyo', aliases: ['park jihyo'], position: 'Leader, Main Vocalist', color: '#6C5CE7' },
      { name: 'Mina', aliases: ['myoui mina'], position: 'Main Dancer, Vocalist', color: '#74B9FF' },
      { name: 'Dahyun', aliases: ['kim dahyun'], position: 'Lead Rapper', color: '#FFEAA7' },
      { name: 'Chaeyoung', aliases: ['son chaeyoung'], position: 'Main Rapper', color: '#55EFC4' },
      { name: 'Tzuyu', aliases: ['chou tzuyu'], position: 'Vocalist, Visual', color: '#A29BFE' },
    ],
  },
  {
    title: 'Name all Stray Kids members',
    slug: 'name-all-stray-kids',
    groupSlug: 'stray-kids',
    timer: 120,
    difficulty: 'medium',
    members: [
      { name: 'Bang Chan', aliases: ['bangchan', 'chan', 'christopher bang'], position: 'Leader, Vocalist, Rapper', color: '#2D3436' },
      { name: 'Lee Know', aliases: ['leeknow', 'minho', 'lee minho'], position: 'Main Dancer, Vocalist', color: '#0984E3' },
      { name: 'Changbin', aliases: ['seo changbin'], position: 'Main Rapper', color: '#E17055' },
      { name: 'Hyunjin', aliases: ['hwang hyunjin'], position: 'Main Dancer, Rapper', color: '#6C5CE7' },
      { name: 'Han', aliases: ['jisung', 'han jisung'], position: 'Main Rapper, Vocalist', color: '#00B894' },
      { name: 'Felix', aliases: ['lee felix', 'yongbok'], position: 'Dancer, Rapper', color: '#FDCB6E' },
      { name: 'Seungmin', aliases: ['kim seungmin'], position: 'Lead Vocalist', color: '#74B9FF' },
      { name: 'I.N', aliases: ['in', 'jeongin', 'yang jeongin'], position: 'Vocalist, Maknae', color: '#E84393' },
    ],
  },
  {
    title: 'Name all SEVENTEEN members',
    slug: 'name-all-seventeen',
    groupSlug: 'seventeen',
    timer: 180,
    difficulty: 'hard',
    members: [
      { name: 'S.Coups', aliases: ['scoups', 'seungcheol', 'choi seungcheol', 'coups'], position: 'Leader, Hip-hop Unit', color: '#378ADD' },
      { name: 'Jeonghan', aliases: ['yoon jeonghan'], position: 'Vocalist', color: '#E889B5' },
      { name: 'Joshua', aliases: ['jisoo', 'hong jisoo'], position: 'Vocalist', color: '#7F77DD' },
      { name: 'Jun', aliases: ['junhui', 'wen junhui'], position: 'Performance Unit', color: '#E6A040' },
      { name: 'Hoshi', aliases: ['soonyoung', 'kwon soonyoung'], position: 'Performance Unit Leader', color: '#D4537E' },
      { name: 'Wonwoo', aliases: ['jeon wonwoo'], position: 'Hip-hop Unit', color: '#0F6E56' },
      { name: 'Woozi', aliases: ['jihoon', 'lee jihoon'], position: 'Vocal Unit Leader', color: '#9B59B6' },
      { name: 'DK', aliases: ['dokyeom', 'seokmin', 'lee seokmin'], position: 'Main Vocalist', color: '#E67E22' },
      { name: 'Mingyu', aliases: ['kim mingyu'], position: 'Hip-hop Unit', color: '#2ECC71' },
      { name: 'The8', aliases: ['the8', 'minghao', 'xu minghao', 'myungho'], position: 'Performance Unit', color: '#3498DB' },
      { name: 'Seungkwan', aliases: ['boo seungkwan'], position: 'Lead Vocalist', color: '#E74C3C' },
      { name: 'Vernon', aliases: ['hansol', 'chwe hansol'], position: 'Hip-hop Unit', color: '#1ABC9C' },
      { name: 'Dino', aliases: ['chan', 'lee chan'], position: 'Performance Unit, Maknae', color: '#F39C12' },
    ],
  },
  {
    title: 'Name all aespa members',
    slug: 'name-all-aespa',
    groupSlug: 'aespa',
    timer: 30,
    difficulty: 'easy',
    members: [
      { name: 'Karina', aliases: ['jimin', 'yoo jimin'], position: 'Leader, Main Dancer', color: '#6C5CE7' },
      { name: 'Giselle', aliases: ['aeri', 'uchinaga aeri'], position: 'Main Rapper', color: '#E84393' },
      { name: 'Winter', aliases: ['minjeong', 'kim minjeong'], position: 'Lead Vocalist', color: '#74B9FF' },
      { name: 'Ningning', aliases: ['ning yizhuo'], position: 'Main Vocalist', color: '#00B894' },
    ],
  },
  {
    title: 'Name all NewJeans members',
    slug: 'name-all-newjeans',
    groupSlug: 'newjeans',
    timer: 45,
    difficulty: 'easy',
    members: [
      { name: 'Minji', aliases: ['kim minji'], position: 'Leader, Vocalist', color: '#6C5CE7' },
      { name: 'Hanni', aliases: ['hanni pham'], position: 'Vocalist', color: '#E84393' },
      { name: 'Danielle', aliases: ['mo danielle'], position: 'Vocalist', color: '#FDCB6E' },
      { name: 'Haerin', aliases: ['kang haerin'], position: 'Vocalist', color: '#00B894' },
      { name: 'Hyein', aliases: ['lee hyein'], position: 'Vocalist, Maknae', color: '#74B9FF' },
    ],
  },
  {
    title: 'Name all IVE members',
    slug: 'name-all-ive',
    groupSlug: 'ive',
    timer: 60,
    difficulty: 'easy',
    members: [
      { name: 'Yujin', aliases: ['ahn yujin'], position: 'Leader, Vocalist', color: '#6C5CE7' },
      { name: 'Gaeul', aliases: ['kim gaeul'], position: 'Lead Dancer', color: '#E17055' },
      { name: 'Rei', aliases: ['naoi rei'], position: 'Vocalist', color: '#FDCB6E' },
      { name: 'Wonyoung', aliases: ['jang wonyoung'], position: 'Center, Visual', color: '#E84393' },
      { name: 'Liz', aliases: ['kim jiwon'], position: 'Main Vocalist', color: '#74B9FF' },
      { name: 'Leeseo', aliases: ['lee hyunseo'], position: 'Vocalist, Maknae', color: '#00B894' },
    ],
  },
  {
    title: 'Name all LE SSERAFIM members',
    slug: 'name-all-le-sserafim',
    groupSlug: 'le-sserafim',
    timer: 45,
    difficulty: 'easy',
    members: [
      { name: 'Sakura', aliases: ['miyawaki sakura'], position: 'Vocalist', color: '#E84393' },
      { name: 'Chaewon', aliases: ['kim chaewon'], position: 'Leader, Vocalist', color: '#6C5CE7' },
      { name: 'Yunjin', aliases: ['huh yunjin'], position: 'Lead Vocalist', color: '#E17055' },
      { name: 'Kazuha', aliases: ['nakamura kazuha'], position: 'Lead Dancer', color: '#00B894' },
      { name: 'Eunchae', aliases: ['hong eunchae'], position: 'Vocalist, Maknae', color: '#74B9FF' },
    ],
  },
  {
    title: 'Name all EXO members',
    slug: 'name-all-exo',
    groupSlug: 'exo',
    timer: 120,
    difficulty: 'medium',
    members: [
      { name: 'Xiumin', aliases: ['minseok', 'kim minseok'], position: 'Lead Vocalist', color: '#74B9FF' },
      { name: 'Suho', aliases: ['junmyeon', 'kim junmyeon'], position: 'Leader, Vocalist', color: '#378ADD' },
      { name: 'Lay', aliases: ['yixing', 'zhang yixing'], position: 'Main Dancer', color: '#00B894' },
      { name: 'Baekhyun', aliases: ['byun baekhyun'], position: 'Main Vocalist', color: '#6C5CE7' },
      { name: 'Chen', aliases: ['jongdae', 'kim jongdae'], position: 'Main Vocalist', color: '#E6A040' },
      { name: 'Chanyeol', aliases: ['park chanyeol'], position: 'Main Rapper', color: '#E74C3C' },
      { name: 'D.O.', aliases: ['do', 'kyungsoo', 'do kyungsoo'], position: 'Main Vocalist', color: '#2D3436' },
      { name: 'Kai', aliases: ['jongin', 'kim jongin'], position: 'Main Dancer, Center', color: '#E84393' },
      { name: 'Sehun', aliases: ['oh sehun'], position: 'Lead Dancer, Rapper', color: '#FDCB6E' },
    ],
  },
  {
    title: 'Name all ENHYPEN members',
    slug: 'name-all-enhypen',
    groupSlug: 'enhypen',
    timer: 60,
    difficulty: 'easy',
    members: [
      { name: 'Heeseung', aliases: ['lee heeseung'], position: 'Vocalist', color: '#6C5CE7' },
      { name: 'Jay', aliases: ['park jongseong'], position: 'Vocalist, Rapper', color: '#E17055' },
      { name: 'Jake', aliases: ['sim jaeyun'], position: 'Vocalist', color: '#FDCB6E' },
      { name: 'Sunghoon', aliases: ['park sunghoon'], position: 'Vocalist', color: '#74B9FF' },
      { name: 'Sunoo', aliases: ['kim sunoo'], position: 'Vocalist', color: '#E84393' },
      { name: 'Jungwon', aliases: ['yang jungwon'], position: 'Leader, Vocalist', color: '#00B894' },
      { name: 'Ni-ki', aliases: ['niki', 'nishimura riki'], position: 'Main Dancer, Maknae', color: '#9B59B6' },
    ],
  },
  {
    title: 'Name all TXT members',
    slug: 'name-all-txt',
    groupSlug: 'txt',
    timer: 45,
    difficulty: 'easy',
    members: [
      { name: 'Soobin', aliases: ['choi soobin'], position: 'Leader, Vocalist', color: '#74B9FF' },
      { name: 'Yeonjun', aliases: ['choi yeonjun'], position: 'Main Rapper, Dancer', color: '#6C5CE7' },
      { name: 'Beomgyu', aliases: ['choi beomgyu'], position: 'Vocalist', color: '#00B894' },
      { name: 'Taehyun', aliases: ['kang taehyun'], position: 'Main Vocalist', color: '#FDCB6E' },
      { name: 'Huening Kai', aliases: ['hueningkai', 'kai kamal huening'], position: 'Vocalist, Maknae', color: '#E84393' },
    ],
  },
  {
    title: 'Name all ATEEZ members',
    slug: 'name-all-ateez',
    groupSlug: 'ateez',
    timer: 120,
    difficulty: 'medium',
    members: [
      { name: 'Hongjoong', aliases: ['kim hongjoong'], position: 'Leader, Main Rapper', color: '#E74C3C' },
      { name: 'Seonghwa', aliases: ['park seonghwa'], position: 'Vocalist', color: '#2D3436' },
      { name: 'Yunho', aliases: ['jeong yunho'], position: 'Main Dancer', color: '#378ADD' },
      { name: 'Yeosang', aliases: ['kang yeosang'], position: 'Vocalist', color: '#FDCB6E' },
      { name: 'San', aliases: ['choi san'], position: 'Vocalist', color: '#E84393' },
      { name: 'Mingi', aliases: ['song mingi'], position: 'Main Rapper', color: '#6C5CE7' },
      { name: 'Wooyoung', aliases: ['jung wooyoung'], position: 'Main Dancer', color: '#00B894' },
      { name: 'Jongho', aliases: ['choi jongho'], position: 'Main Vocalist, Maknae', color: '#E6A040' },
    ],
  },
  {
    title: 'Name all Red Velvet members',
    slug: 'name-all-red-velvet',
    groupSlug: 'red-velvet',
    timer: 45,
    difficulty: 'easy',
    members: [
      { name: 'Irene', aliases: ['joohyun', 'bae joohyun'], position: 'Leader, Vocalist, Visual', color: '#E74C3C' },
      { name: 'Seulgi', aliases: ['kang seulgi'], position: 'Main Dancer, Lead Vocalist', color: '#E6A040' },
      { name: 'Wendy', aliases: ['seungwan', 'son seungwan'], position: 'Main Vocalist', color: '#74B9FF' },
      { name: 'Joy', aliases: ['sooyoung', 'park sooyoung'], position: 'Lead Rapper, Vocalist', color: '#00B894' },
      { name: 'Yeri', aliases: ['yerrim', 'kim yerrim'], position: 'Vocalist, Maknae', color: '#9B59B6' },
    ],
  },
  {
    title: 'Name all ITZY members',
    slug: 'name-all-itzy',
    groupSlug: 'itzy',
    timer: 45,
    difficulty: 'easy',
    members: [
      { name: 'Yeji', aliases: ['hwang yeji'], position: 'Leader, Main Dancer', color: '#E84393' },
      { name: 'Lia', aliases: ['choi jisu'], position: 'Main Vocalist', color: '#74B9FF' },
      { name: 'Ryujin', aliases: ['shin ryujin'], position: 'Main Rapper, Dancer', color: '#2D3436' },
      { name: 'Chaeryeong', aliases: ['lee chaeryeong'], position: 'Main Dancer', color: '#FDCB6E' },
      { name: 'Yuna', aliases: ['shin yuna'], position: 'Vocalist, Maknae', color: '#6C5CE7' },
    ],
  },
  {
    title: 'Name all (G)I-DLE members',
    slug: 'name-all-gidle',
    groupSlug: 'g-i-dle',
    timer: 45,
    difficulty: 'easy',
    members: [
      { name: 'Miyeon', aliases: ['cho miyeon'], position: 'Main Vocalist', color: '#E84393' },
      { name: 'Minnie', aliases: ['nicha yontararak'], position: 'Main Vocalist', color: '#FDCB6E' },
      { name: 'Soyeon', aliases: ['jeon soyeon'], position: 'Leader, Main Rapper', color: '#6C5CE7' },
      { name: 'Yuqi', aliases: ['song yuqi'], position: 'Vocalist', color: '#00B894' },
      { name: 'Shuhua', aliases: ['yeh shuhua'], position: 'Vocalist, Maknae', color: '#74B9FF' },
    ],
  },
  {
    title: 'Name all NCT 127 members',
    slug: 'name-all-nct-127',
    groupSlug: 'nct',
    timer: 150,
    difficulty: 'hard',
    members: [
      { name: 'Taeyong', aliases: ['lee taeyong'], position: 'Leader, Main Rapper, Main Dancer', color: '#E74C3C' },
      { name: 'Taeil', aliases: ['moon taeil'], position: 'Main Vocalist', color: '#378ADD' },
      { name: 'Johnny', aliases: ['john suh', 'seo youngho'], position: 'Vocalist', color: '#2D3436' },
      { name: 'Yuta', aliases: ['nakamoto yuta'], position: 'Lead Dancer', color: '#00B894' },
      { name: 'Doyoung', aliases: ['kim doyoung'], position: 'Main Vocalist', color: '#6C5CE7' },
      { name: 'Jaehyun', aliases: ['jung jaehyun'], position: 'Lead Vocalist, Visual', color: '#E84393' },
      { name: 'Jungwoo', aliases: ['kim jungwoo'], position: 'Lead Vocalist', color: '#FDCB6E' },
      { name: 'Mark', aliases: ['mark lee'], position: 'Main Rapper', color: '#E6A040' },
      { name: 'Haechan', aliases: ['lee donghyuck'], position: 'Main Vocalist', color: '#9B59B6' },
    ],
  },
  {
    title: 'Name all NCT Dream members',
    slug: 'name-all-nct-dream',
    groupSlug: 'general-kpop',
    timer: 60,
    difficulty: 'medium',
    members: [
      { name: 'Mark', aliases: ['mark lee'], position: 'Main Rapper', color: '#E6A040' },
      { name: 'Renjun', aliases: ['huang renjun'], position: 'Main Vocalist', color: '#74B9FF' },
      { name: 'Jeno', aliases: ['lee jeno'], position: 'Lead Dancer', color: '#00B894' },
      { name: 'Haechan', aliases: ['lee donghyuck'], position: 'Main Vocalist', color: '#9B59B6' },
      { name: 'Jaemin', aliases: ['na jaemin'], position: 'Lead Dancer, Lead Rapper', color: '#E84393' },
      { name: 'Chenle', aliases: ['zhong chenle'], position: 'Main Vocalist', color: '#FDCB6E' },
      { name: 'Jisung', aliases: ['park jisung'], position: 'Main Dancer, Maknae', color: '#6C5CE7' },
    ],
  },
  {
    title: 'Name all SHINee members',
    slug: 'name-all-shinee',
    groupSlug: 'shinee',
    timer: 30,
    difficulty: 'easy',
    members: [
      { name: 'Onew', aliases: ['jinki', 'lee jinki'], position: 'Leader, Main Vocalist', color: '#378ADD' },
      { name: 'Key', aliases: ['kibum', 'kim kibum'], position: 'Lead Rapper, Vocalist', color: '#E84393' },
      { name: 'Minho', aliases: ['choi minho'], position: 'Main Rapper, Visual', color: '#00B894' },
      { name: 'Taemin', aliases: ['lee taemin'], position: 'Main Dancer, Vocalist', color: '#6C5CE7' },
    ],
  },
  {
    title: 'Name all NMIXX members',
    slug: 'name-all-nmixx',
    groupSlug: 'general-kpop',
    timer: 60,
    difficulty: 'medium',
    members: [
      { name: 'Lily', aliases: ['lily jin morrow'], position: 'Main Vocalist', color: '#E84393' },
      { name: 'Haewon', aliases: ['oh haewon'], position: 'Leader, Vocalist', color: '#6C5CE7' },
      { name: 'Sullyoon', aliases: ['shin sullyoon'], position: 'Vocalist, Visual', color: '#74B9FF' },
      { name: 'Bae', aliases: ['bae jihyun'], position: 'Vocalist', color: '#FDCB6E' },
      { name: 'Jiwoo', aliases: ['kim jiwoo'], position: 'Rapper', color: '#00B894' },
      { name: 'Kyujin', aliases: ['jang kyujin'], position: 'Main Dancer, Rapper, Maknae', color: '#E74C3C' },
    ],
  },
  {
    title: 'Name all GOT7 members',
    slug: 'name-all-got7',
    groupSlug: 'general-kpop',
    timer: 60,
    difficulty: 'medium',
    members: [
      { name: 'JB', aliases: ['jay b', 'im jaebum', 'jaebeom'], position: 'Leader, Main Vocalist', color: '#2D3436' },
      { name: 'Mark', aliases: ['mark tuan'], position: 'Lead Rapper', color: '#E74C3C' },
      { name: 'Jackson', aliases: ['jackson wang'], position: 'Main Rapper', color: '#FDCB6E' },
      { name: 'Jinyoung', aliases: ['park jinyoung'], position: 'Lead Vocalist', color: '#378ADD' },
      { name: 'Youngjae', aliases: ['choi youngjae'], position: 'Main Vocalist', color: '#00B894' },
      { name: 'BamBam', aliases: ['kunpimook bhuwakul'], position: 'Lead Rapper, Dancer', color: '#6C5CE7' },
      { name: 'Yugyeom', aliases: ['kim yugyeom'], position: 'Main Dancer, Maknae', color: '#E84393' },
    ],
  },
  {
    title: 'Name all MAMAMOO members',
    slug: 'name-all-mamamoo',
    groupSlug: 'general-kpop',
    timer: 30,
    difficulty: 'easy',
    members: [
      { name: 'Solar', aliases: ['yongsun', 'kim yongsun'], position: 'Leader, Main Vocalist', color: '#FDCB6E' },
      { name: 'Moonbyul', aliases: ['moonbyulyi', 'moon byulyi'], position: 'Main Rapper, Dancer', color: '#378ADD' },
      { name: 'Wheein', aliases: ['jung wheein'], position: 'Lead Vocalist', color: '#E84393' },
      { name: 'Hwasa', aliases: ['hyejin', 'ahn hyejin'], position: 'Main Vocalist', color: '#E74C3C' },
    ],
  },
  {
    title: 'Name all TREASURE members',
    slug: 'name-all-treasure',
    groupSlug: 'general-kpop',
    timer: 150,
    difficulty: 'hard',
    members: [
      { name: 'Hyunsuk', aliases: ['choi hyunsuk'], position: 'Leader, Main Rapper', color: '#E74C3C' },
      { name: 'Jihoon', aliases: ['park jihoon'], position: 'Vocalist', color: '#378ADD' },
      { name: 'Yoshi', aliases: ['kanemoto yoshinori'], position: 'Rapper', color: '#FDCB6E' },
      { name: 'Junkyu', aliases: ['kim junkyu'], position: 'Vocalist', color: '#6C5CE7' },
      { name: 'Mashiho', aliases: ['takata mashiho'], position: 'Vocalist', color: '#E84393' },
      { name: 'Jaehyuk', aliases: ['yoon jaehyuk'], position: 'Vocalist', color: '#00B894' },
      { name: 'Asahi', aliases: ['hamada asahi'], position: 'Vocalist', color: '#74B9FF' },
      { name: 'Yedam', aliases: ['bang yedam'], position: 'Main Vocalist', color: '#E6A040' },
      { name: 'Doyoung', aliases: ['kim doyoung'], position: 'Dancer', color: '#9B59B6' },
      { name: 'Haruto', aliases: ['watanabe haruto'], position: 'Rapper', color: '#2D3436' },
    ],
  },
  {
    title: 'Name all BABYMONSTER members',
    slug: 'name-all-babymonster',
    groupSlug: 'general-kpop',
    timer: 60,
    difficulty: 'medium',
    members: [
      { name: 'Ruka', aliases: [], position: 'Main Dancer, Rapper', color: '#E74C3C' },
      { name: 'Pharita', aliases: [], position: 'Vocalist', color: '#6C5CE7' },
      { name: 'Asa', aliases: [], position: 'Vocalist', color: '#FDCB6E' },
      { name: 'Ahyeon', aliases: [], position: 'Main Vocalist, Center', color: '#E84393' },
      { name: 'Rami', aliases: [], position: 'Vocalist', color: '#74B9FF' },
      { name: 'Chiquita', aliases: [], position: 'Main Dancer', color: '#00B894' },
      { name: 'Haram', aliases: [], position: 'Vocalist, Maknae', color: '#9B59B6' },
    ],
  },
];

// ============================================================
// Main seed function
// ============================================================

async function main() {
  const isClean = process.argv.includes('--clean');

  if (isClean) {
    console.log('Cleaning previous name-all games...');
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('game_type', 'name_all_members');
    const ids = (existing ?? []).map(g => g.id);
    if (ids.length > 0) {
      await supabase.from('game_plays').delete().in('game_id', ids);
      await supabase.from('games').delete().in('id', ids);
      console.log(`  Cleaned ${ids.length} name-all games.`);
    } else {
      console.log('  No name-all games found.');
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

  console.log(`\nSeeding ${GAMES.length} name-all-members games...`);
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

    const content = {
      members: game.members.map(m => ({
        name: m.name,
        aliases: m.aliases,
        photo_url: IDOL_PHOTOS[`${game.slug}:${m.name}`] ? `/idols/${IDOL_PHOTOS[`${game.slug}:${m.name}`]}` : null,
        position: m.position,
        color: m.color,
      })),
      timer_seconds: game.timer,
      difficulty: game.difficulty,
    };

    const { error } = await supabase.from('games').insert({
      creator_id: creatorId,
      group_id: groupId,
      title: game.title,
      slug: game.slug,
      game_type: 'name_all_members',
      content,
      matchup_count: game.members.length,
      status: 'published',
      play_count: Math.floor(Math.random() * 80) + 20,
    });

    if (error) {
      console.error(`  Failed "${game.title}": ${error.message}`);
      continue;
    }

    inserted++;
    console.log(`  [${inserted}] "${game.title}" (${game.members.length} members, ${game.timer}s, ${game.difficulty})`);
  }

  console.log(`\nSeeded ${inserted}/${GAMES.length} games.`);

  // Verification
  const { count } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('game_type', 'name_all_members')
    .eq('status', 'published');
  console.log(`Total name-all-members games in DB: ${count}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
