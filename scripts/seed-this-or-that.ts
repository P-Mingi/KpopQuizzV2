import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load env -- check process.env first (for production overrides), then .env.local
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
// Types
// ============================================================

interface ItemDef {
  name: string;
  subtitle: string;
  color: string;
  tags: string[];
}

interface CategoryDef {
  slug: string;
  title: string;
  subtitle: string;
  type: 'idol' | 'group' | 'song';
  pool_size: number;
  items: ItemDef[];
}

// ============================================================
// Data
// ============================================================

const CATEGORIES: CategoryDef[] = [
  // ── Idol categories ──────────────────────────────────────────
  {
    slug: 'boy-group-idols',
    title: 'Boy group idols',
    subtitle: 'Who is the ultimate K-pop boy?',
    type: 'idol',
    pool_size: 32,
    items: [
      { name: 'Jungkook', subtitle: 'BTS', color: '#1a3f7a', tags: ['Main vocal', 'Center'] },
      { name: 'V', subtitle: 'BTS', color: '#3d2e7a', tags: ['Visual', 'Vocal'] },
      { name: 'Jimin', subtitle: 'BTS', color: '#6e2244', tags: ['Main dancer', 'Vocal'] },
      { name: 'RM', subtitle: 'BTS', color: '#2a4a5a', tags: ['Leader', 'Main rapper'] },
      { name: 'Suga', subtitle: 'BTS', color: '#3a3a3a', tags: ['Rapper', 'Producer'] },
      { name: 'Jin', subtitle: 'BTS', color: '#5a3040', tags: ['Visual', 'Vocal'] },
      { name: 'J-Hope', subtitle: 'BTS', color: '#4a3020', tags: ['Main dancer', 'Rapper'] },
      { name: 'Felix', subtitle: 'Stray Kids', color: '#0a4a36', tags: ['Dancer', 'Rapper'] },
      { name: 'Hyunjin', subtitle: 'Stray Kids', color: '#0d5a42', tags: ['Main dancer', 'Visual'] },
      { name: 'Bang Chan', subtitle: 'Stray Kids', color: '#3a2a08', tags: ['Leader', 'Producer'] },
      { name: 'Han', subtitle: 'Stray Kids', color: '#2a3a2a', tags: ['Main rapper', 'Vocal'] },
      { name: 'Mingyu', subtitle: 'SEVENTEEN', color: '#1a3d6a', tags: ['Visual', 'Rapper'] },
      { name: 'Hoshi', subtitle: 'SEVENTEEN', color: '#5a1a3a', tags: ['Performance leader'] },
      { name: 'Woozi', subtitle: 'SEVENTEEN', color: '#4a1a2a', tags: ['Vocal leader', 'Producer'] },
      { name: 'S.Coups', subtitle: 'SEVENTEEN', color: '#2a3a5a', tags: ['Leader', 'Rapper'] },
      { name: 'San', subtitle: 'ATEEZ', color: '#6a1a1a', tags: ['Vocal', 'Dancer'] },
      { name: 'Hongjoong', subtitle: 'ATEEZ', color: '#4a1a2a', tags: ['Leader', 'Rapper'] },
      { name: 'Wooyoung', subtitle: 'ATEEZ', color: '#2a1a4a', tags: ['Main dancer', 'Vocal'] },
      { name: 'Yeonjun', subtitle: 'TXT', color: '#5a3d0a', tags: ['Center', 'Rapper'] },
      { name: 'Soobin', subtitle: 'TXT', color: '#2a4a12', tags: ['Leader', 'Vocal'] },
      { name: 'Beomgyu', subtitle: 'TXT', color: '#3a2a3a', tags: ['Vocal', 'Visual'] },
      { name: 'Heeseung', subtitle: 'ENHYPEN', color: '#4a2010', tags: ['Main vocal', 'Dancer'] },
      { name: 'Sunghoon', subtitle: 'ENHYPEN', color: '#1a3a1a', tags: ['Visual', 'Dancer'] },
      { name: 'Jake', subtitle: 'ENHYPEN', color: '#2a3a3a', tags: ['Vocal', 'Dancer'] },
      { name: 'Taeyong', subtitle: 'NCT 127', color: '#5a2a1a', tags: ['Leader', 'Main rapper'] },
      { name: 'Mark', subtitle: 'NCT 127', color: '#2a3a4a', tags: ['Main rapper', 'Vocal'] },
      { name: 'Jaehyun', subtitle: 'NCT 127', color: '#3a2a3a', tags: ['Vocal', 'Visual'] },
      { name: 'Cha Eun-woo', subtitle: 'ASTRO', color: '#3a2d6a', tags: ['Visual', 'Vocal'] },
      { name: 'Jackson', subtitle: 'GOT7', color: '#4a2a1a', tags: ['Rapper', 'Variety'] },
      { name: 'Taemin', subtitle: 'SHINee', color: '#2a1a3a', tags: ['Main dancer', 'Vocal'] },
      { name: 'Baekhyun', subtitle: 'EXO', color: '#3a2a4a', tags: ['Main vocal'] },
      { name: 'Kai', subtitle: 'EXO', color: '#4a2a2a', tags: ['Main dancer', 'Visual'] },
    ],
  },
  {
    slug: 'girl-group-idols',
    title: 'Girl group idols',
    subtitle: 'Who is the ultimate K-pop girl?',
    type: 'idol',
    pool_size: 32,
    items: [
      { name: 'Jennie', subtitle: 'BLACKPINK', color: '#5a2a3a', tags: ['Rapper', 'Vocal', 'Center'] },
      { name: 'Lisa', subtitle: 'BLACKPINK', color: '#4a3a2a', tags: ['Main dancer', 'Rapper'] },
      { name: 'Rose', subtitle: 'BLACKPINK', color: '#5a3a4a', tags: ['Main vocal'] },
      { name: 'Jisoo', subtitle: 'BLACKPINK', color: '#3a2a4a', tags: ['Visual', 'Vocal'] },
      { name: 'Karina', subtitle: 'aespa', color: '#2a3a5a', tags: ['Leader', 'Main dancer'] },
      { name: 'Winter', subtitle: 'aespa', color: '#3a3a4a', tags: ['Main vocal', 'Dancer'] },
      { name: 'Ningning', subtitle: 'aespa', color: '#4a2a3a', tags: ['Main vocal'] },
      { name: 'Giselle', subtitle: 'aespa', color: '#3a2a3a', tags: ['Rapper', 'Vocal'] },
      { name: 'Wonyoung', subtitle: 'IVE', color: '#4a2a4a', tags: ['Center', 'Visual'] },
      { name: 'Yujin', subtitle: 'IVE', color: '#3a3a3a', tags: ['Leader', 'Vocal'] },
      { name: 'Rei', subtitle: 'IVE', color: '#2a3a4a', tags: ['Dancer', 'Rapper'] },
      { name: 'Minji', subtitle: 'NewJeans', color: '#2a2a4a', tags: ['Leader', 'Vocal'] },
      { name: 'Hanni', subtitle: 'NewJeans', color: '#3a2a3a', tags: ['Vocal', 'Dancer'] },
      { name: 'Danielle', subtitle: 'NewJeans', color: '#4a3a3a', tags: ['Vocal', 'Visual'] },
      { name: 'Haerin', subtitle: 'NewJeans', color: '#2a3a3a', tags: ['Vocal', 'Visual'] },
      { name: 'Nayeon', subtitle: 'TWICE', color: '#4a2a3a', tags: ['Center', 'Vocal'] },
      { name: 'Sana', subtitle: 'TWICE', color: '#5a3a3a', tags: ['Vocal', 'Dancer'] },
      { name: 'Momo', subtitle: 'TWICE', color: '#3a2a2a', tags: ['Main dancer'] },
      { name: 'Tzuyu', subtitle: 'TWICE', color: '#2a4a3a', tags: ['Visual', 'Maknae'] },
      { name: 'Yeji', subtitle: 'ITZY', color: '#4a2a2a', tags: ['Leader', 'Main dancer'] },
      { name: 'Ryujin', subtitle: 'ITZY', color: '#3a3a2a', tags: ['Rapper', 'Dancer'] },
      { name: 'Yuna', subtitle: 'ITZY', color: '#5a3a4a', tags: ['Visual', 'Vocal'] },
      { name: 'Chaewon', subtitle: 'LE SSERAFIM', color: '#3a2a4a', tags: ['Leader', 'Vocal'] },
      { name: 'Sakura', subtitle: 'LE SSERAFIM', color: '#4a3a4a', tags: ['Visual', 'Vocal'] },
      { name: 'Kazuha', subtitle: 'LE SSERAFIM', color: '#2a3a4a', tags: ['Dancer', 'Visual'] },
      { name: 'Yunjin', subtitle: 'LE SSERAFIM', color: '#5a2a3a', tags: ['Vocal'] },
      { name: 'Irene', subtitle: 'Red Velvet', color: '#3a2a3a', tags: ['Leader', 'Visual'] },
      { name: 'Seulgi', subtitle: 'Red Velvet', color: '#4a2a2a', tags: ['Main dancer', 'Vocal'] },
      { name: 'Hwasa', subtitle: 'MAMAMOO', color: '#5a2a2a', tags: ['Vocal', 'Rapper'] },
      { name: 'Solar', subtitle: 'MAMAMOO', color: '#4a3a2a', tags: ['Leader', 'Main vocal'] },
      { name: 'Soyeon', subtitle: '(G)I-DLE', color: '#3a3a3a', tags: ['Leader', 'Main rapper'] },
      { name: 'Miyeon', subtitle: '(G)I-DLE', color: '#4a3a4a', tags: ['Main vocal', 'Visual'] },
    ],
  },
  {
    slug: '4th-gen-bg-idols',
    title: '4th gen boy group idols',
    subtitle: 'Best 4th gen boy?',
    type: 'idol',
    pool_size: 28,
    items: [
      { name: 'Felix', subtitle: 'Stray Kids', color: '#0a4a36', tags: ['Dancer', 'Rapper'] },
      { name: 'Hyunjin', subtitle: 'Stray Kids', color: '#0d5a42', tags: ['Main dancer', 'Visual'] },
      { name: 'Bang Chan', subtitle: 'Stray Kids', color: '#3a2a08', tags: ['Leader', 'Producer'] },
      { name: 'Han', subtitle: 'Stray Kids', color: '#2a3a2a', tags: ['Main rapper', 'Vocal'] },
      { name: 'Lee Know', subtitle: 'Stray Kids', color: '#1a3a4a', tags: ['Main dancer'] },
      { name: 'Changbin', subtitle: 'Stray Kids', color: '#3a2a1a', tags: ['Main rapper'] },
      { name: 'Seungmin', subtitle: 'Stray Kids', color: '#2a3a5a', tags: ['Lead vocal'] },
      { name: 'I.N', subtitle: 'Stray Kids', color: '#4a2a3a', tags: ['Vocal', 'Maknae'] },
      { name: 'Yeonjun', subtitle: 'TXT', color: '#5a3d0a', tags: ['Center', 'Rapper'] },
      { name: 'Soobin', subtitle: 'TXT', color: '#2a4a12', tags: ['Leader', 'Vocal'] },
      { name: 'Beomgyu', subtitle: 'TXT', color: '#3a2a3a', tags: ['Vocal', 'Visual'] },
      { name: 'Taehyun', subtitle: 'TXT', color: '#4a3a1a', tags: ['Main vocal'] },
      { name: 'Huening Kai', subtitle: 'TXT', color: '#3a2a4a', tags: ['Vocal', 'Maknae'] },
      { name: 'Heeseung', subtitle: 'ENHYPEN', color: '#4a2010', tags: ['Main vocal', 'Dancer'] },
      { name: 'Jay', subtitle: 'ENHYPEN', color: '#3a2a1a', tags: ['Vocal', 'Rapper'] },
      { name: 'Jake', subtitle: 'ENHYPEN', color: '#2a3a3a', tags: ['Vocal', 'Dancer'] },
      { name: 'Sunghoon', subtitle: 'ENHYPEN', color: '#1a3a1a', tags: ['Visual', 'Dancer'] },
      { name: 'Sunoo', subtitle: 'ENHYPEN', color: '#4a3a3a', tags: ['Vocal'] },
      { name: 'Jungwon', subtitle: 'ENHYPEN', color: '#2a4a2a', tags: ['Leader', 'Vocal'] },
      { name: 'Ni-ki', subtitle: 'ENHYPEN', color: '#3a1a3a', tags: ['Main dancer', 'Maknae'] },
      { name: 'San', subtitle: 'ATEEZ', color: '#6a1a1a', tags: ['Vocal', 'Dancer'] },
      { name: 'Hongjoong', subtitle: 'ATEEZ', color: '#4a1a2a', tags: ['Leader', 'Rapper'] },
      { name: 'Wooyoung', subtitle: 'ATEEZ', color: '#2a1a4a', tags: ['Main dancer', 'Vocal'] },
      { name: 'Yunho', subtitle: 'ATEEZ', color: '#1a3a5a', tags: ['Main dancer'] },
      { name: 'Mingi', subtitle: 'ATEEZ', color: '#3a2a4a', tags: ['Rapper'] },
      { name: 'Seonghwa', subtitle: 'ATEEZ', color: '#2a2a3a', tags: ['Vocal', 'Visual'] },
      { name: 'Jongho', subtitle: 'ATEEZ', color: '#4a3a1a', tags: ['Main vocal'] },
      { name: 'Yeosang', subtitle: 'ATEEZ', color: '#3a3a2a', tags: ['Vocal', 'Dancer'] },
    ],
  },
  {
    slug: '4th-gen-gg-idols',
    title: '4th gen girl group idols',
    subtitle: 'Best 4th gen girl?',
    type: 'idol',
    pool_size: 31,
    items: [
      { name: 'Karina', subtitle: 'aespa', color: '#2a3a5a', tags: ['Leader', 'Main dancer'] },
      { name: 'Winter', subtitle: 'aespa', color: '#3a3a4a', tags: ['Main vocal', 'Dancer'] },
      { name: 'Ningning', subtitle: 'aespa', color: '#4a2a3a', tags: ['Main vocal'] },
      { name: 'Giselle', subtitle: 'aespa', color: '#3a2a3a', tags: ['Rapper', 'Vocal'] },
      { name: 'Wonyoung', subtitle: 'IVE', color: '#4a2a4a', tags: ['Center', 'Visual'] },
      { name: 'Yujin', subtitle: 'IVE', color: '#3a3a3a', tags: ['Leader', 'Vocal'] },
      { name: 'Gaeul', subtitle: 'IVE', color: '#3a2a2a', tags: ['Lead dancer'] },
      { name: 'Rei', subtitle: 'IVE', color: '#2a3a4a', tags: ['Dancer', 'Rapper'] },
      { name: 'Liz', subtitle: 'IVE', color: '#4a3a4a', tags: ['Main vocal'] },
      { name: 'Leeseo', subtitle: 'IVE', color: '#3a4a3a', tags: ['Vocal', 'Maknae'] },
      { name: 'Minji', subtitle: 'NewJeans', color: '#2a2a4a', tags: ['Leader', 'Vocal'] },
      { name: 'Hanni', subtitle: 'NewJeans', color: '#3a2a3a', tags: ['Vocal', 'Dancer'] },
      { name: 'Danielle', subtitle: 'NewJeans', color: '#4a3a3a', tags: ['Vocal', 'Visual'] },
      { name: 'Haerin', subtitle: 'NewJeans', color: '#2a3a3a', tags: ['Vocal', 'Visual'] },
      { name: 'Hyein', subtitle: 'NewJeans', color: '#3a3a4a', tags: ['Vocal', 'Maknae'] },
      { name: 'Chaewon', subtitle: 'LE SSERAFIM', color: '#3a2a4a', tags: ['Leader', 'Vocal'] },
      { name: 'Sakura', subtitle: 'LE SSERAFIM', color: '#4a3a4a', tags: ['Visual', 'Vocal'] },
      { name: 'Kazuha', subtitle: 'LE SSERAFIM', color: '#2a3a4a', tags: ['Dancer', 'Visual'] },
      { name: 'Yunjin', subtitle: 'LE SSERAFIM', color: '#5a2a3a', tags: ['Vocal'] },
      { name: 'Eunchae', subtitle: 'LE SSERAFIM', color: '#3a4a4a', tags: ['Vocal', 'Maknae'] },
      { name: 'Yeji', subtitle: 'ITZY', color: '#4a2a2a', tags: ['Leader', 'Main dancer'] },
      { name: 'Lia', subtitle: 'ITZY', color: '#3a3a4a', tags: ['Main vocal'] },
      { name: 'Ryujin', subtitle: 'ITZY', color: '#3a3a2a', tags: ['Rapper', 'Dancer'] },
      { name: 'Chaeryeong', subtitle: 'ITZY', color: '#4a3a3a', tags: ['Main dancer'] },
      { name: 'Yuna', subtitle: 'ITZY', color: '#5a3a4a', tags: ['Visual', 'Vocal'] },
      { name: 'Lily', subtitle: 'NMIXX', color: '#4a2a3a', tags: ['Main vocal'] },
      { name: 'Haewon', subtitle: 'NMIXX', color: '#3a3a3a', tags: ['Leader', 'Vocal'] },
      { name: 'Sullyoon', subtitle: 'NMIXX', color: '#2a3a5a', tags: ['Visual', 'Vocal'] },
      { name: 'Bae', subtitle: 'NMIXX', color: '#4a3a2a', tags: ['Vocal'] },
      { name: 'Jiwoo', subtitle: 'NMIXX', color: '#2a4a3a', tags: ['Rapper'] },
      { name: 'Kyujin', subtitle: 'NMIXX', color: '#5a2a2a', tags: ['Main dancer', 'Maknae'] },
    ],
  },
  {
    slug: '3rd-gen-idols',
    title: '3rd gen idols',
    subtitle: 'Best of the 3rd generation',
    type: 'idol',
    pool_size: 27,
    items: [
      { name: 'Jungkook', subtitle: 'BTS', color: '#1a3f7a', tags: ['Main vocal', 'Center'] },
      { name: 'V', subtitle: 'BTS', color: '#3d2e7a', tags: ['Visual', 'Vocal'] },
      { name: 'Jimin', subtitle: 'BTS', color: '#6e2244', tags: ['Main dancer', 'Vocal'] },
      { name: 'RM', subtitle: 'BTS', color: '#2a4a5a', tags: ['Leader', 'Main rapper'] },
      { name: 'Suga', subtitle: 'BTS', color: '#3a3a3a', tags: ['Rapper', 'Producer'] },
      { name: 'Jin', subtitle: 'BTS', color: '#5a3040', tags: ['Visual', 'Vocal'] },
      { name: 'J-Hope', subtitle: 'BTS', color: '#4a3020', tags: ['Main dancer', 'Rapper'] },
      { name: 'Jennie', subtitle: 'BLACKPINK', color: '#5a2a3a', tags: ['Rapper', 'Vocal'] },
      { name: 'Lisa', subtitle: 'BLACKPINK', color: '#4a3a2a', tags: ['Main dancer', 'Rapper'] },
      { name: 'Rose', subtitle: 'BLACKPINK', color: '#5a3a4a', tags: ['Main vocal'] },
      { name: 'Jisoo', subtitle: 'BLACKPINK', color: '#3a2a4a', tags: ['Visual', 'Vocal'] },
      { name: 'Nayeon', subtitle: 'TWICE', color: '#4a2a3a', tags: ['Center', 'Vocal'] },
      { name: 'Sana', subtitle: 'TWICE', color: '#5a3a3a', tags: ['Vocal', 'Dancer'] },
      { name: 'Momo', subtitle: 'TWICE', color: '#3a2a2a', tags: ['Main dancer'] },
      { name: 'Tzuyu', subtitle: 'TWICE', color: '#2a4a3a', tags: ['Visual', 'Maknae'] },
      { name: 'Irene', subtitle: 'Red Velvet', color: '#3a2a3a', tags: ['Leader', 'Visual'] },
      { name: 'Seulgi', subtitle: 'Red Velvet', color: '#4a2a2a', tags: ['Main dancer'] },
      { name: 'Joy', subtitle: 'Red Velvet', color: '#3a4a3a', tags: ['Vocal', 'Actress'] },
      { name: 'Baekhyun', subtitle: 'EXO', color: '#3a2a4a', tags: ['Main vocal'] },
      { name: 'Kai', subtitle: 'EXO', color: '#4a2a2a', tags: ['Main dancer', 'Visual'] },
      { name: 'D.O.', subtitle: 'EXO', color: '#2a2a2a', tags: ['Main vocal', 'Actor'] },
      { name: 'Chanyeol', subtitle: 'EXO', color: '#4a3a2a', tags: ['Rapper', 'Vocal'] },
      { name: 'Mingyu', subtitle: 'SEVENTEEN', color: '#1a3d6a', tags: ['Visual', 'Rapper'] },
      { name: 'Hoshi', subtitle: 'SEVENTEEN', color: '#5a1a3a', tags: ['Performance leader'] },
      { name: 'Woozi', subtitle: 'SEVENTEEN', color: '#4a1a2a', tags: ['Vocal leader'] },
      { name: 'Jackson', subtitle: 'GOT7', color: '#4a2a1a', tags: ['Rapper', 'Variety'] },
      { name: 'Hwasa', subtitle: 'MAMAMOO', color: '#5a2a2a', tags: ['Vocal', 'Rapper'] },
    ],
  },
  {
    slug: 'bts-members',
    title: 'BTS members',
    subtitle: 'Who is your BTS bias?',
    type: 'idol',
    pool_size: 7,
    items: [
      { name: 'RM', subtitle: 'Leader, Main rapper', color: '#2a4a5a', tags: ['Leader', 'Main rapper'] },
      { name: 'Jin', subtitle: 'Visual, Vocal', color: '#5a3040', tags: ['Visual', 'Vocal'] },
      { name: 'Suga', subtitle: 'Lead rapper, Producer', color: '#3a3a3a', tags: ['Lead rapper', 'Producer'] },
      { name: 'J-Hope', subtitle: 'Main dancer, Rapper', color: '#4a3020', tags: ['Main dancer', 'Rapper'] },
      { name: 'Jimin', subtitle: 'Main dancer, Vocal', color: '#6e2244', tags: ['Main dancer', 'Vocal'] },
      { name: 'V', subtitle: 'Visual, Vocal', color: '#3d2e7a', tags: ['Visual', 'Vocal'] },
      { name: 'Jungkook', subtitle: 'Main vocal, Center', color: '#1a3f7a', tags: ['Main vocal', 'Center'] },
    ],
  },
  {
    slug: 'blackpink-members',
    title: 'BLACKPINK members',
    subtitle: 'Who is your BLACKPINK bias?',
    type: 'idol',
    pool_size: 4,
    items: [
      { name: 'Jisoo', subtitle: 'Visual, Vocal', color: '#3a2a4a', tags: ['Visual', 'Vocal'] },
      { name: 'Jennie', subtitle: 'Rapper, Vocal, Center', color: '#5a2a3a', tags: ['Rapper', 'Vocal', 'Center'] },
      { name: 'Rose', subtitle: 'Main vocal', color: '#5a3a4a', tags: ['Main vocal'] },
      { name: 'Lisa', subtitle: 'Main dancer, Rapper', color: '#4a3a2a', tags: ['Main dancer', 'Rapper'] },
    ],
  },
  {
    slug: 'seventeen-members',
    title: 'SEVENTEEN members',
    subtitle: 'Who is your SVT bias?',
    type: 'idol',
    pool_size: 13,
    items: [
      { name: 'S.Coups', subtitle: 'Leader, Hip-hop unit', color: '#2a3a5a', tags: ['Leader', 'Rapper'] },
      { name: 'Jeonghan', subtitle: 'Vocal', color: '#4a3a4a', tags: ['Vocal'] },
      { name: 'Joshua', subtitle: 'Vocal', color: '#3a3a5a', tags: ['Vocal'] },
      { name: 'Jun', subtitle: 'Performance unit', color: '#4a3a2a', tags: ['Dancer'] },
      { name: 'Hoshi', subtitle: 'Performance leader', color: '#5a1a3a', tags: ['Performance leader'] },
      { name: 'Wonwoo', subtitle: 'Hip-hop unit', color: '#2a3a3a', tags: ['Rapper'] },
      { name: 'Woozi', subtitle: 'Vocal leader, Producer', color: '#4a1a2a', tags: ['Vocal leader', 'Producer'] },
      { name: 'DK', subtitle: 'Main vocal', color: '#4a3a1a', tags: ['Main vocal'] },
      { name: 'Mingyu', subtitle: 'Visual, Rapper', color: '#1a3d6a', tags: ['Visual', 'Rapper'] },
      { name: 'The8', subtitle: 'Performance unit', color: '#3a2a4a', tags: ['Dancer'] },
      { name: 'Seungkwan', subtitle: 'Lead vocal', color: '#4a2a2a', tags: ['Lead vocal'] },
      { name: 'Vernon', subtitle: 'Hip-hop unit', color: '#2a4a3a', tags: ['Rapper'] },
      { name: 'Dino', subtitle: 'Performance unit, Maknae', color: '#3a3a2a', tags: ['Dancer', 'Maknae'] },
    ],
  },
  {
    slug: 'stray-kids-members',
    title: 'Stray Kids members',
    subtitle: 'Who is your SKZ bias?',
    type: 'idol',
    pool_size: 8,
    items: [
      { name: 'Bang Chan', subtitle: 'Leader, Producer', color: '#3a2a08', tags: ['Leader', 'Producer'] },
      { name: 'Lee Know', subtitle: 'Main dancer', color: '#1a3a4a', tags: ['Main dancer'] },
      { name: 'Changbin', subtitle: 'Main rapper', color: '#3a2a1a', tags: ['Main rapper'] },
      { name: 'Hyunjin', subtitle: 'Main dancer, Visual', color: '#0d5a42', tags: ['Main dancer', 'Visual'] },
      { name: 'Han', subtitle: 'Main rapper, Vocal', color: '#2a3a2a', tags: ['Main rapper', 'Vocal'] },
      { name: 'Felix', subtitle: 'Dancer, Rapper', color: '#0a4a36', tags: ['Dancer', 'Rapper'] },
      { name: 'Seungmin', subtitle: 'Lead vocal', color: '#2a3a5a', tags: ['Lead vocal'] },
      { name: 'I.N', subtitle: 'Vocal, Maknae', color: '#4a2a3a', tags: ['Vocal', 'Maknae'] },
    ],
  },

  // ── Group categories ─────────────────────────────────────────
  {
    slug: 'boy-groups',
    title: 'Boy groups',
    subtitle: 'Best K-pop boy group ever?',
    type: 'group',
    pool_size: 16,
    items: [
      { name: 'BTS', subtitle: 'HYBE', color: '#1a3a5a', tags: ['3rd gen', '7 members'] },
      { name: 'Stray Kids', subtitle: 'JYP', color: '#0a4a36', tags: ['4th gen', '8 members'] },
      { name: 'SEVENTEEN', subtitle: 'Pledis/HYBE', color: '#3a2d6a', tags: ['3rd gen', '13 members'] },
      { name: 'EXO', subtitle: 'SM', color: '#4a2a2a', tags: ['3rd gen', '9 members'] },
      { name: 'ATEEZ', subtitle: 'KQ', color: '#5a1a1a', tags: ['4th gen', '8 members'] },
      { name: 'TXT', subtitle: 'HYBE', color: '#5a3d0a', tags: ['4th gen', '5 members'] },
      { name: 'ENHYPEN', subtitle: 'HYBE', color: '#4a2010', tags: ['4th gen', '7 members'] },
      { name: 'NCT 127', subtitle: 'SM', color: '#5a2a1a', tags: ['3rd gen', '10 members'] },
      { name: 'NCT Dream', subtitle: 'SM', color: '#2a4a3a', tags: ['4th gen', '7 members'] },
      { name: 'GOT7', subtitle: 'JYP', color: '#4a2a1a', tags: ['3rd gen', '7 members'] },
      { name: 'SHINee', subtitle: 'SM', color: '#2a1a3a', tags: ['2nd gen', '4 members'] },
      { name: 'BIGBANG', subtitle: 'YG', color: '#3a3a3a', tags: ['2nd gen', '5 members'] },
      { name: 'Super Junior', subtitle: 'SM', color: '#1a2a5a', tags: ['2nd gen', 'Legacy'] },
      { name: 'TREASURE', subtitle: 'YG', color: '#3a2a1a', tags: ['4th gen', '10 members'] },
      { name: 'BOYNEXTDOOR', subtitle: 'HYBE', color: '#2a3a3a', tags: ['5th gen', '6 members'] },
      { name: 'RIIZE', subtitle: 'SM', color: '#4a3a3a', tags: ['5th gen', '6 members'] },
    ],
  },
  {
    slug: 'girl-groups',
    title: 'Girl groups',
    subtitle: 'Best K-pop girl group ever?',
    type: 'group',
    pool_size: 16,
    items: [
      { name: 'BLACKPINK', subtitle: 'YG', color: '#5a2a3a', tags: ['3rd gen', '4 members'] },
      { name: 'TWICE', subtitle: 'JYP', color: '#4a2a3a', tags: ['3rd gen', '9 members'] },
      { name: 'aespa', subtitle: 'SM', color: '#2a3a5a', tags: ['4th gen', '4 members'] },
      { name: 'IVE', subtitle: 'Starship', color: '#4a2a4a', tags: ['4th gen', '6 members'] },
      { name: 'NewJeans', subtitle: 'ADOR/HYBE', color: '#2a2a4a', tags: ['4th gen', '5 members'] },
      { name: 'LE SSERAFIM', subtitle: 'Source/HYBE', color: '#3a2a4a', tags: ['4th gen', '5 members'] },
      { name: 'ITZY', subtitle: 'JYP', color: '#4a2a2a', tags: ['4th gen', '5 members'] },
      { name: 'Red Velvet', subtitle: 'SM', color: '#3a2a3a', tags: ['3rd gen', '5 members'] },
      { name: '(G)I-DLE', subtitle: 'Cube', color: '#3a3a3a', tags: ['4th gen', '5 members'] },
      { name: 'MAMAMOO', subtitle: 'RBW', color: '#5a2a2a', tags: ['3rd gen', '4 members'] },
      { name: 'NMIXX', subtitle: 'JYP', color: '#4a3a2a', tags: ['4th gen', '6 members'] },
      { name: "Girls' Generation", subtitle: 'SM', color: '#5a3a4a', tags: ['2nd gen', 'Legacy'] },
      { name: '2NE1', subtitle: 'YG', color: '#4a3a3a', tags: ['2nd gen', 'Legacy'] },
      { name: 'f(x)', subtitle: 'SM', color: '#2a3a4a', tags: ['2nd gen', 'Legacy'] },
      { name: 'BABYMONSTER', subtitle: 'YG', color: '#3a2a2a', tags: ['5th gen', '7 members'] },
      { name: 'Kep1er', subtitle: 'WAKEONE', color: '#4a4a2a', tags: ['4th gen', '9 members'] },
    ],
  },
  {
    slug: '4th-gen-groups',
    title: '4th gen groups',
    subtitle: 'Best 4th generation group?',
    type: 'group',
    pool_size: 16,
    items: [
      { name: 'Stray Kids', subtitle: 'JYP', color: '#0a4a36', tags: ['Boy group', '8 members'] },
      { name: 'ATEEZ', subtitle: 'KQ', color: '#5a1a1a', tags: ['Boy group', '8 members'] },
      { name: 'TXT', subtitle: 'HYBE', color: '#5a3d0a', tags: ['Boy group', '5 members'] },
      { name: 'ENHYPEN', subtitle: 'HYBE', color: '#4a2010', tags: ['Boy group', '7 members'] },
      { name: 'aespa', subtitle: 'SM', color: '#2a3a5a', tags: ['Girl group', '4 members'] },
      { name: 'IVE', subtitle: 'Starship', color: '#4a2a4a', tags: ['Girl group', '6 members'] },
      { name: 'NewJeans', subtitle: 'ADOR', color: '#2a2a4a', tags: ['Girl group', '5 members'] },
      { name: 'LE SSERAFIM', subtitle: 'Source Music', color: '#3a2a4a', tags: ['Girl group', '5 members'] },
      { name: 'ITZY', subtitle: 'JYP', color: '#4a2a2a', tags: ['Girl group', '5 members'] },
      { name: '(G)I-DLE', subtitle: 'Cube', color: '#3a3a3a', tags: ['Girl group', '5 members'] },
      { name: 'NMIXX', subtitle: 'JYP', color: '#4a3a2a', tags: ['Girl group', '6 members'] },
      { name: 'TREASURE', subtitle: 'YG', color: '#3a2a1a', tags: ['Boy group', '10 members'] },
      { name: 'NCT Dream', subtitle: 'SM', color: '#2a4a3a', tags: ['Boy group', '7 members'] },
      { name: 'Kep1er', subtitle: 'WAKEONE', color: '#4a4a2a', tags: ['Girl group', '9 members'] },
      { name: 'RIIZE', subtitle: 'SM', color: '#4a3a3a', tags: ['Boy group', '6 members'] },
      { name: 'BOYNEXTDOOR', subtitle: 'HYBE', color: '#2a3a3a', tags: ['Boy group', '6 members'] },
    ],
  },
  {
    slug: 'legend-groups',
    title: '2nd/3rd gen legends',
    subtitle: 'Greatest groups of the past',
    type: 'group',
    pool_size: 16,
    items: [
      { name: 'BTS', subtitle: 'HYBE', color: '#1a3a5a', tags: ['3rd gen', 'Boy group'] },
      { name: 'BLACKPINK', subtitle: 'YG', color: '#5a2a3a', tags: ['3rd gen', 'Girl group'] },
      { name: 'TWICE', subtitle: 'JYP', color: '#4a2a3a', tags: ['3rd gen', 'Girl group'] },
      { name: 'EXO', subtitle: 'SM', color: '#4a2a2a', tags: ['3rd gen', 'Boy group'] },
      { name: 'SEVENTEEN', subtitle: 'Pledis', color: '#3a2d6a', tags: ['3rd gen', 'Boy group'] },
      { name: 'GOT7', subtitle: 'JYP', color: '#4a2a1a', tags: ['3rd gen', 'Boy group'] },
      { name: 'Red Velvet', subtitle: 'SM', color: '#3a2a3a', tags: ['3rd gen', 'Girl group'] },
      { name: 'MAMAMOO', subtitle: 'RBW', color: '#5a2a2a', tags: ['3rd gen', 'Girl group'] },
      { name: 'SHINee', subtitle: 'SM', color: '#2a1a3a', tags: ['2nd gen', 'Boy group'] },
      { name: 'BIGBANG', subtitle: 'YG', color: '#3a3a3a', tags: ['2nd gen', 'Boy group'] },
      { name: 'Super Junior', subtitle: 'SM', color: '#1a2a5a', tags: ['2nd gen', 'Boy group'] },
      { name: "Girls' Generation", subtitle: 'SM', color: '#5a3a4a', tags: ['2nd gen', 'Girl group'] },
      { name: '2NE1', subtitle: 'YG', color: '#4a3a3a', tags: ['2nd gen', 'Girl group'] },
      { name: 'f(x)', subtitle: 'SM', color: '#2a3a4a', tags: ['2nd gen', 'Girl group'] },
      { name: '2PM', subtitle: 'JYP', color: '#3a3a2a', tags: ['2nd gen', 'Boy group'] },
      { name: 'Wonder Girls', subtitle: 'JYP', color: '#4a3a4a', tags: ['2nd gen', 'Girl group'] },
    ],
  },

  // ── Song categories ──────────────────────────────────────────
  {
    slug: 'iconic-kpop-songs',
    title: 'Iconic K-pop songs',
    subtitle: 'Greatest K-pop song ever?',
    type: 'song',
    pool_size: 16,
    items: [
      { name: 'Dynamite', subtitle: 'BTS', color: '#1a3a5a', tags: ['2020', 'English'] },
      { name: 'DDU-DU DDU-DU', subtitle: 'BLACKPINK', color: '#5a2a3a', tags: ['2018', 'Girl crush'] },
      { name: 'Gangnam Style', subtitle: 'PSY', color: '#4a3a2a', tags: ['2012', 'Viral'] },
      { name: 'Growl', subtitle: 'EXO', color: '#4a2a2a', tags: ['2013', 'Breakthrough'] },
      { name: 'Gee', subtitle: "Girls' Generation", color: '#5a3a4a', tags: ['2009', 'Iconic'] },
      { name: 'Sorry Sorry', subtitle: 'Super Junior', color: '#1a2a5a', tags: ['2009', 'Dance'] },
      { name: 'Fantastic Baby', subtitle: 'BIGBANG', color: '#3a3a3a', tags: ['2012', 'Party'] },
      { name: 'Blood Sweat & Tears', subtitle: 'BTS', color: '#3d2e7a', tags: ['2016', 'Dark'] },
      { name: 'Cheer Up', subtitle: 'TWICE', color: '#4a2a3a', tags: ['2016', 'Viral dance'] },
      { name: 'LOVE DIVE', subtitle: 'IVE', color: '#4a2a4a', tags: ['2022', 'Addictive'] },
      { name: 'Hype Boy', subtitle: 'NewJeans', color: '#2a2a4a', tags: ['2022', 'Y2K'] },
      { name: 'Super Shy', subtitle: 'NewJeans', color: '#3a3a4a', tags: ['2023', 'Summer'] },
      { name: 'Next Level', subtitle: 'aespa', color: '#2a3a5a', tags: ['2021', 'Experimental'] },
      { name: 'Supernova', subtitle: 'aespa', color: '#3a2a4a', tags: ['2024', 'Viral'] },
      { name: "God's Menu", subtitle: 'Stray Kids', color: '#0a4a36', tags: ['2020', 'Hard-hitting'] },
      { name: 'Spring Day', subtitle: 'BTS', color: '#4a3a5a', tags: ['2017', 'Emotional'] },
    ],
  },
  {
    slug: 'bts-songs',
    title: 'BTS songs',
    subtitle: 'Best BTS song?',
    type: 'song',
    pool_size: 16,
    items: [
      { name: 'No More Dream', subtitle: '2013', color: '#2a3a4a', tags: ['Debut'] },
      { name: 'Boy In Luv', subtitle: '2014', color: '#3a2a3a', tags: ['School trilogy'] },
      { name: 'I Need U', subtitle: '2015', color: '#4a3a5a', tags: ['The Most Beautiful Moment'] },
      { name: 'Dope', subtitle: '2015', color: '#3a3a2a', tags: ['Hype'] },
      { name: 'Fire', subtitle: '2016', color: '#5a2a1a', tags: ['Hype'] },
      { name: 'Blood Sweat & Tears', subtitle: '2016', color: '#3d2e7a', tags: ['Wings era'] },
      { name: 'Spring Day', subtitle: '2017', color: '#4a3a5a', tags: ['Emotional'] },
      { name: 'DNA', subtitle: '2017', color: '#1a4a5a', tags: ['Love Yourself'] },
      { name: 'Fake Love', subtitle: '2018', color: '#2a1a3a', tags: ['Dark'] },
      { name: 'IDOL', subtitle: '2018', color: '#4a3a1a', tags: ['Cultural'] },
      { name: 'Boy With Luv', subtitle: '2019', color: '#5a3a4a', tags: ['ft. Halsey'] },
      { name: 'ON', subtitle: '2020', color: '#3a2a2a', tags: ['MOTS'] },
      { name: 'Dynamite', subtitle: '2020', color: '#1a3a5a', tags: ['First English'] },
      { name: 'Butter', subtitle: '2021', color: '#5a4a1a', tags: ['Summer'] },
      { name: 'Permission to Dance', subtitle: '2021', color: '#4a3a3a', tags: ['Feel-good'] },
      { name: 'Yet to Come', subtitle: '2022', color: '#3a3a4a', tags: ['Anthology'] },
    ],
  },
  {
    slug: 'blackpink-songs',
    title: 'BLACKPINK songs',
    subtitle: 'Best BLACKPINK song?',
    type: 'song',
    pool_size: 16,
    items: [
      { name: 'Boombayah', subtitle: '2016', color: '#4a2a2a', tags: ['Debut'] },
      { name: 'Whistle', subtitle: '2016', color: '#3a3a3a', tags: ['Debut'] },
      { name: 'Playing With Fire', subtitle: '2016', color: '#5a2a1a', tags: ['Comeback'] },
      { name: "As If It's Your Last", subtitle: '2017', color: '#5a3a4a', tags: ['Summer'] },
      { name: 'DDU-DU DDU-DU', subtitle: '2018', color: '#5a2a3a', tags: ['Iconic'] },
      { name: 'Kill This Love', subtitle: '2019', color: '#4a1a1a', tags: ['Dark'] },
      { name: 'How You Like That', subtitle: '2020', color: '#3a2a3a', tags: ['Pre-release'] },
      { name: 'Lovesick Girls', subtitle: '2020', color: '#4a3a4a', tags: ['THE ALBUM'] },
      { name: 'Pink Venom', subtitle: '2022', color: '#3a2a4a', tags: ['BORN PINK'] },
      { name: 'Shut Down', subtitle: '2022', color: '#2a2a3a', tags: ['Classical'] },
      { name: 'SOLO', subtitle: 'Jennie', color: '#5a2a3a', tags: ['Solo debut'] },
      { name: 'On The Ground', subtitle: 'Rose', color: '#5a3a4a', tags: ['Solo'] },
      { name: 'LALISA', subtitle: 'Lisa', color: '#4a3a2a', tags: ['Solo'] },
      { name: 'Flower', subtitle: 'Jisoo', color: '#3a4a3a', tags: ['Solo'] },
      { name: 'Money', subtitle: 'Lisa', color: '#3a2a2a', tags: ['Viral'] },
      { name: 'Ice Cream', subtitle: 'ft. Selena Gomez', color: '#4a3a4a', tags: ['Collab'] },
    ],
  },
  {
    slug: 'aespa-songs',
    title: 'aespa songs',
    subtitle: 'Best aespa song?',
    type: 'song',
    pool_size: 12,
    items: [
      { name: 'Black Mamba', subtitle: '2020', color: '#2a2a3a', tags: ['Debut'] },
      { name: 'Next Level', subtitle: '2021', color: '#2a3a5a', tags: ['Breakthrough'] },
      { name: 'Savage', subtitle: '2021', color: '#4a2a3a', tags: ['First mini album'] },
      { name: 'Girls', subtitle: '2022', color: '#3a3a4a', tags: ['Summer'] },
      { name: 'Spicy', subtitle: '2023', color: '#5a2a2a', tags: ['MY WORLD'] },
      { name: 'Drama', subtitle: '2023', color: '#3a2a4a', tags: ['Single'] },
      { name: 'Supernova', subtitle: '2024', color: '#3a2a4a', tags: ['Viral hit'] },
      { name: 'Armageddon', subtitle: '2024', color: '#2a2a4a', tags: ['First album'] },
      { name: 'Whiplash', subtitle: '2024', color: '#4a2a2a', tags: ['Single'] },
      { name: 'Hold On Tight', subtitle: '2023', color: '#3a3a3a', tags: ['Collab'] },
      { name: 'Better Things', subtitle: '2023', color: '#4a3a3a', tags: ['MY WORLD'] },
      { name: 'Live My Life', subtitle: '2024', color: '#3a4a3a', tags: ['Armageddon'] },
    ],
  },
  {
    slug: '4th-gen-songs',
    title: '4th gen hit songs',
    subtitle: 'Best 4th gen song?',
    type: 'song',
    pool_size: 18,
    items: [
      { name: "God's Menu", subtitle: 'Stray Kids', color: '#0a4a36', tags: ['2020'] },
      { name: 'MANIAC', subtitle: 'Stray Kids', color: '#0d5a42', tags: ['2022'] },
      { name: 'Thunderous', subtitle: 'Stray Kids', color: '#2a3a2a', tags: ['2021'] },
      { name: 'DALLA DALLA', subtitle: 'ITZY', color: '#4a2a2a', tags: ['2019', 'Debut'] },
      { name: 'WANNABE', subtitle: 'ITZY', color: '#3a3a2a', tags: ['2020'] },
      { name: 'ELEVEN', subtitle: 'IVE', color: '#4a2a4a', tags: ['2021', 'Debut'] },
      { name: 'LOVE DIVE', subtitle: 'IVE', color: '#3a3a3a', tags: ['2022'] },
      { name: 'I AM', subtitle: 'IVE', color: '#3a2a4a', tags: ['2023'] },
      { name: 'Attention', subtitle: 'NewJeans', color: '#2a2a4a', tags: ['2022', 'Debut'] },
      { name: 'Hype Boy', subtitle: 'NewJeans', color: '#3a2a3a', tags: ['2022'] },
      { name: 'Ditto', subtitle: 'NewJeans', color: '#4a3a3a', tags: ['2022'] },
      { name: 'Super Shy', subtitle: 'NewJeans', color: '#3a3a4a', tags: ['2023'] },
      { name: 'Next Level', subtitle: 'aespa', color: '#2a3a5a', tags: ['2021'] },
      { name: 'Supernova', subtitle: 'aespa', color: '#3a2a4a', tags: ['2024'] },
      { name: 'FEARLESS', subtitle: 'LE SSERAFIM', color: '#3a2a4a', tags: ['2022', 'Debut'] },
      { name: 'ANTIFRAGILE', subtitle: 'LE SSERAFIM', color: '#4a3a3a', tags: ['2022'] },
      { name: 'TOMBOY', subtitle: '(G)I-DLE', color: '#3a3a3a', tags: ['2022'] },
      { name: 'Queencard', subtitle: '(G)I-DLE', color: '#4a3a2a', tags: ['2023'] },
    ],
  },
  {
    slug: 'gg-songs',
    title: 'Girl group songs',
    subtitle: 'Best girl group song?',
    type: 'song',
    pool_size: 18,
    items: [
      { name: 'DDU-DU DDU-DU', subtitle: 'BLACKPINK', color: '#5a2a3a', tags: ['2018'] },
      { name: 'Kill This Love', subtitle: 'BLACKPINK', color: '#4a1a1a', tags: ['2019'] },
      { name: 'How You Like That', subtitle: 'BLACKPINK', color: '#3a2a3a', tags: ['2020'] },
      { name: 'Cheer Up', subtitle: 'TWICE', color: '#4a2a3a', tags: ['2016'] },
      { name: 'TT', subtitle: 'TWICE', color: '#5a3a3a', tags: ['2016'] },
      { name: 'Fancy', subtitle: 'TWICE', color: '#3a2a2a', tags: ['2019'] },
      { name: 'Next Level', subtitle: 'aespa', color: '#2a3a5a', tags: ['2021'] },
      { name: 'Supernova', subtitle: 'aespa', color: '#3a2a4a', tags: ['2024'] },
      { name: 'LOVE DIVE', subtitle: 'IVE', color: '#4a2a4a', tags: ['2022'] },
      { name: 'I AM', subtitle: 'IVE', color: '#3a2a4a', tags: ['2023'] },
      { name: 'Hype Boy', subtitle: 'NewJeans', color: '#2a2a4a', tags: ['2022'] },
      { name: 'Super Shy', subtitle: 'NewJeans', color: '#3a3a4a', tags: ['2023'] },
      { name: 'FEARLESS', subtitle: 'LE SSERAFIM', color: '#3a2a4a', tags: ['2022'] },
      { name: 'DALLA DALLA', subtitle: 'ITZY', color: '#4a2a2a', tags: ['2019'] },
      { name: 'WANNABE', subtitle: 'ITZY', color: '#3a3a2a', tags: ['2020'] },
      { name: 'TOMBOY', subtitle: '(G)I-DLE', color: '#3a3a3a', tags: ['2022'] },
      { name: 'Gee', subtitle: "Girls' Generation", color: '#5a3a4a', tags: ['2009'] },
      { name: 'I Am the Best', subtitle: '2NE1', color: '#4a3a3a', tags: ['2011'] },
    ],
  },
  {
    slug: 'bg-songs',
    title: 'Boy group songs',
    subtitle: 'Best boy group song?',
    type: 'song',
    pool_size: 18,
    items: [
      { name: 'Dynamite', subtitle: 'BTS', color: '#1a3a5a', tags: ['2020'] },
      { name: 'Butter', subtitle: 'BTS', color: '#5a4a1a', tags: ['2021'] },
      { name: 'Spring Day', subtitle: 'BTS', color: '#4a3a5a', tags: ['2017'] },
      { name: "God's Menu", subtitle: 'Stray Kids', color: '#0a4a36', tags: ['2020'] },
      { name: 'MANIAC', subtitle: 'Stray Kids', color: '#0d5a42', tags: ['2022'] },
      { name: "Don't Wanna Cry", subtitle: 'SEVENTEEN', color: '#3a2d6a', tags: ['2017'] },
      { name: 'Super', subtitle: 'SEVENTEEN', color: '#4a2a3a', tags: ['2023'] },
      { name: 'Growl', subtitle: 'EXO', color: '#4a2a2a', tags: ['2013'] },
      { name: 'Love Shot', subtitle: 'EXO', color: '#5a1a2a', tags: ['2018'] },
      { name: 'Replay', subtitle: 'SHINee', color: '#2a1a3a', tags: ['2008'] },
      { name: 'Lucifer', subtitle: 'SHINee', color: '#3a2a4a', tags: ['2010'] },
      { name: 'Fantastic Baby', subtitle: 'BIGBANG', color: '#3a3a3a', tags: ['2012'] },
      { name: 'Sorry Sorry', subtitle: 'Super Junior', color: '#1a2a5a', tags: ['2009'] },
      { name: 'Given-Taken', subtitle: 'ENHYPEN', color: '#4a2010', tags: ['2020'] },
      { name: 'Bite Me', subtitle: 'ENHYPEN', color: '#3a1a2a', tags: ['2023'] },
      { name: 'Crown', subtitle: 'TXT', color: '#5a3d0a', tags: ['2019'] },
      { name: 'Blue Hour', subtitle: 'TXT', color: '#2a3a5a', tags: ['2020'] },
      { name: 'Pirate King', subtitle: 'ATEEZ', color: '#5a1a1a', tags: ['2018'] },
    ],
  },
];

// ============================================================
// Main seed function
// ============================================================

async function main() {
  const isClean = process.argv.includes('--clean');

  if (isClean) {
    console.log('Cleaning existing This or That data...');

    const { error: e1 } = await supabase.from('tot_plays').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e1) console.error('  Failed to clean tot_plays:', e1.message);
    else console.log('  Cleaned tot_plays');

    const { error: e2 } = await supabase.from('tot_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e2) console.error('  Failed to clean tot_items:', e2.message);
    else console.log('  Cleaned tot_items');

    const { error: e3 } = await supabase.from('tot_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (e3) console.error('  Failed to clean tot_categories:', e3.message);
    else console.log('  Cleaned tot_categories');

    console.log('');
  }

  console.log(`Seeding ${CATEGORIES.length} This or That categories...\n`);

  let catInserted = 0;
  let totalItems = 0;

  for (const cat of CATEGORIES) {
    // Check if category already exists
    const { data: existing } = await supabase
      .from('tot_categories')
      .select('id')
      .eq('slug', cat.slug)
      .maybeSingle();

    if (existing) {
      console.log(`  "${cat.title}" already exists, skipping.`);
      continue;
    }

    // Insert category with random play_count (10-80)
    const playCount = Math.floor(Math.random() * 71) + 10;

    const { data: inserted, error: catErr } = await supabase
      .from('tot_categories')
      .insert({
        slug: cat.slug,
        title: cat.title,
        subtitle: cat.subtitle,
        type: cat.type,
        pool_size: cat.pool_size,
        play_count: playCount,
        is_published: true,
      })
      .select('id')
      .single();

    if (catErr || !inserted) {
      console.error(`  Failed to insert category "${cat.title}": ${catErr?.message}`);
      continue;
    }

    const categoryId = inserted.id;

    // Insert all items for this category
    const itemRows = cat.items.map((item, idx) => ({
      category_id: categoryId,
      name: item.name,
      subtitle: item.subtitle,
      color: item.color,
      tags: item.tags,
      sort_order: idx,
    }));

    const { error: itemsErr } = await supabase.from('tot_items').insert(itemRows);

    if (itemsErr) {
      console.error(`  Failed to insert items for "${cat.title}": ${itemsErr.message}`);
      continue;
    }

    catInserted++;
    totalItems += cat.items.length;
    console.log(`  [${catInserted}] "${cat.title}" - ${cat.items.length} items (type: ${cat.type}, pool: ${cat.pool_size}, plays: ${playCount})`);
  }

  console.log(`\nSeeded ${catInserted}/${CATEGORIES.length} categories with ${totalItems} total items.`);

  // Verification
  const { count: catCount } = await supabase
    .from('tot_categories')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true);

  const { count: itemCount } = await supabase
    .from('tot_items')
    .select('*', { count: 'exact', head: true });

  console.log(`\nVerification - Categories in DB: ${catCount}, Items in DB: ${itemCount}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
