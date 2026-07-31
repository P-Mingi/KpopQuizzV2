'use client';

import { useEffect, useState } from 'react';

import { CoverArt } from '@/components/verse/cover-art';

import type { Quest, QuestSize } from '@/lib/verse/quests';

interface Xp { signedIn: boolean; xp: number; role: string; tier: string; nextTier: string | null; xpToNext: number | null }
interface Props { quests: Quest[]; coveragePct: number; groupId: number; groupName: string }

const ICON: Record<string, React.ReactNode> = {
  flag: <path d="M4 3v18M4 4h13l-2 4 2 4H4" />,
  timeline: <><circle cx="6" cy="12" r="2" /><path d="M8 12h12M14 6l6 6-6 6" /></>,
  'user-heart': <><circle cx="9" cy="8" r="3.2" /><path d="M4 20a5 5 0 0 1 10 0M17.5 13.5c1-1 2.5-.4 2.5.9 0 1-1 1.9-2.5 2.6-1.5-.7-2.5-1.6-2.5-2.6 0-1.3 1.5-1.9 2.5-.9Z" /></>,
  'microphone-2': <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" /></>,
};

function QuestIcon({ name }: { name: string }): React.ReactElement {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICON[name] ?? ICON.flag}</svg>;
}

const SIZES: QuestSize[] = ['Quick', 'Medium', 'Big'];

export function QuestBoard({ quests, coveragePct, groupId, groupName }: Props): React.ReactElement {
  const [xp, setXp] = useState<Xp | null>(null);
  const [filter, setFilter] = useState<QuestSize | 'All'>('All');
  const [shown, setShown] = useState(8);

  useEffect(() => {
    fetch(`/api/verse/space-xp?group_id=${groupId}`).then((r) => (r.ok ? r.json() : null)).then(setXp).catch(() => {});
  }, [groupId]);

  const list = quests.filter((q) => filter === 'All' || q.size === filter).slice(0, shown);
  const total = quests.filter((q) => filter === 'All' || q.size === filter).length;

  function start(q: Quest) {
    if (xp && !xp.signedIn) { window.location.href = `/login?returnTo=${encodeURIComponent(q.href)}`; return; }
    window.location.href = q.href;
  }

  const sizeStyle = (s: QuestSize) => s === 'Big' ? { bg: 'var(--bg-accent)', fg: 'var(--text-accent)' } : { bg: 'var(--verse-soft)', fg: 'var(--text-secondary)' };

  return (
    <div>
      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--verse-line)', background: 'var(--verse-soft)' }}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--verse-accent) 0 ${coveragePct}%, var(--verse-line) ${coveragePct}% 100%)` }}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold tabular-nums" style={{ background: 'var(--verse-soft)', color: 'var(--verse-ink)' }}>{coveragePct}%</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--verse-ink)' }}>Help write {groupName}&rsquo;s story</p>
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--verse-ink)' }}>{groupName} is {coveragePct}% complete</h1>
            <p className="mt-0.5 text-sm text-secondary">{quests.length} way{quests.length === 1 ? '' : 's'} to leave your mark. Pick one and go.</p>
          </div>
        </div>
      </div>

      {quests.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed px-5 py-10 text-center text-secondary" style={{ borderColor: 'var(--verse-line)' }}>This space is fully built. Nothing open right now.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {(['All', ...SIZES] as const).map((s) => {
              const count = s === 'All' ? quests.length : quests.filter((q) => q.size === s).length;
              if (s !== 'All' && count === 0) return null;
              const active = filter === s;
              return <button key={s} onClick={() => { setFilter(s); setShown(8); }} className="rounded-full border px-3 py-1 text-xs font-semibold" style={active ? { borderColor: 'var(--verse-accent)', background: 'var(--verse-soft-strong)', color: 'var(--verse-ink)' } : { borderColor: 'var(--verse-line)', color: 'var(--text-secondary)' }}>{s} <span className="tabular-nums text-tertiary">{count}</span></button>;
            })}
          </div>

          <ul className="mt-3 space-y-2">
            {list.map((q) => {
              const ss = sizeStyle(q.size);
              const big = q.size === 'Big';
              return (
                <li key={q.id} className="flex items-center gap-3 rounded-xl p-3" style={{ border: big ? '2px solid var(--verse-cta, var(--verse-accent))' : '0.5px solid var(--verse-line)', background: 'var(--verse-soft)' }}>
                  {q.art?.kind === 'cover' ? (
                    <CoverArt mbid={q.art.mbid} title={q.title} className="w-11 flex-shrink-0 rounded-lg" />
                  ) : q.art?.kind === 'photo' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={q.art.url} alt="" loading="lazy" className="h-11 w-11 flex-shrink-0 rounded-lg v-portrait" />
                  ) : (
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--verse-soft-strong)', color: big ? 'var(--verse-ink)' : 'var(--text-secondary)' }}><QuestIcon name={q.icon} /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: 'var(--verse-ink)' }}>{q.title}</p>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: ss.bg, color: ss.fg }}>{q.size}</span>
                      {q.curatorOnly ? <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-tertiary" style={{ border: '1px solid var(--verse-line)' }}>curator</span> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-secondary">{q.why}</p>
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={{ color: big ? 'var(--verse-accent)' : 'var(--text-secondary)' }}>+{q.xp}&nbsp;xp</span>
                  <button onClick={() => start(q)} className="v-tap whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold no-underline" style={{ background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text))' }}>Start</button>
                </li>
              );
            })}
          </ul>
          {shown < total ? <button onClick={() => setShown((n) => n + 12)} className="v-tap mx-auto mt-3 flex min-h-[40px] items-center justify-center rounded-full border px-5 text-sm font-bold" style={{ borderColor: 'var(--verse-line)', color: 'var(--verse-ink)' }}>Show {total - shown} more quests</button> : null}
        </>
      )}

      {/* Your progress here: quests ladder toward earning edit rights. */}
      <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--verse-line)' }}>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-tertiary">Your progress here</p>
        {!xp || !xp.signedIn ? (
          <p className="text-sm text-secondary">Sign in and join to start earning XP. Reach <span className="font-semibold" style={{ color: 'var(--verse-ink)' }}>Regular (100 XP)</span> and you earn edit rights in this space.</p>
        ) : (
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm" style={{ color: 'var(--verse-ink)' }}>{groupName} rank &middot; <span className="font-bold">{xp.tier}</span> <span className="text-tertiary tabular-nums">({xp.xp} XP)</span></p>
              {xp.nextTier ? <p className="text-xs text-tertiary tabular-nums">{xp.xpToNext} XP to {xp.nextTier}</p> : <p className="text-xs text-tertiary">Top rank</p>}
            </div>
            {xp.nextTier ? (
              <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: 'var(--verse-line)' }}>
                <div className="h-full" style={{ width: `${Math.min(100, Math.round((xp.xp / (xp.xp + (xp.xpToNext ?? 1))) * 100))}%`, background: 'var(--verse-cta, var(--verse-accent))' }} />
              </div>
            ) : null}
            {xp.role === 'member' ? <p className="mt-1.5 text-xs text-tertiary">Your XP ladders toward Contributor (edit rights under Stage B). It stays with {groupName}.</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
