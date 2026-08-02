import Link from 'next/link';
import { SectionHeader } from '@/components/verse/primitives/section-header';

import { getSpaceGraph } from '@/lib/verse/atlas/data';
import { neighborhood } from '@/lib/verse/atlas/graph';

import type { ModuleProps } from './module-registry';

// V-ATLAS step 5 - the mini-map home widget (duality). Its own identity: a small
// STATIC constellation glyph (no physics, no interactivity beyond the whole card
// linking into the Atlas), distinct from the binder / shelf / essay widgets.
// Min-gated: a space whose published graph is too sparse to make a map (under 10
// nodes) renders nothing.
export async function AtlasMiniMapModule({ space }: ModuleProps): Promise<React.ReactElement | null> {
  const graph = await getSpaceGraph(space);
  const nb = neighborhood(graph, `space:${space.group.slug}`);
  if (nb.counts.published < 10) return null; // not enough universe to chart

  // A clean radial glyph from the real inner ring (deterministic, no physics).
  const ring1 = nb.nodes.filter((n) => n.ring === 1).slice(0, 9);
  const R = 74;
  const dots = ring1.map((n, i) => {
    const a = -Math.PI / 2 + (i / Math.max(1, ring1.length)) * Math.PI * 2;
    return { x: Math.round(Math.cos(a) * R), y: Math.round(Math.sin(a) * R), hub: n.hub };
  });

  const { members, albums } = space.counts;
  const parts = [members ? `${members} members` : null, albums ? `${albums} releases` : null].filter(Boolean);

  return (
    <Link href={`/verse/${space.group.slug}/wiki`} className="group block no-underline">
      <SectionHeader kicker="Atlas" />

      <div className="my-2 flex justify-center rounded-xl py-3" style={{ background: 'radial-gradient(120% 90% at 50% 30%, color-mix(in srgb, var(--verse-ink) 6%, transparent), transparent 70%)' }}>
        <svg viewBox="-100 -100 200 200" width="150" height="150" role="img" aria-label={`Constellation map of ${space.group.name}`} className="block">
          <g stroke="color-mix(in srgb, var(--verse-ink) 22%, transparent)" strokeWidth={1.2}>
            {dots.map((d, i) => <line key={i} x1={0} y1={0} x2={d.x} y2={d.y} />)}
          </g>
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.hub ? 8 : 6}
              fill={d.hub ? 'color-mix(in srgb, var(--verse-ink) 12%, var(--bg-surface))' : 'var(--bg-surface)'}
              stroke={d.hub ? 'var(--verse-ink)' : 'color-mix(in srgb, var(--verse-ink) 34%, transparent)'} strokeWidth={1.5} />
          ))}
          <circle cx={0} cy={0} r={13} fill="var(--verse-ink)" />
          <circle cx={0} cy={0} r={18} fill="none" stroke="var(--verse-ink)" strokeWidth={1} opacity={0.28} />
        </svg>
      </div>

      <p className="text-[15px] font-extrabold leading-snug" style={{ color: 'var(--verse-ink)' }}>The {space.group.fandom_name} universe</p>
      {parts.length ? <p className="mt-0.5 text-xs text-tertiary tabular-nums">{parts.join(' · ')}, all connected</p> : null}
      <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold group-hover:underline" style={{ color: 'var(--verse-ink)' }}>
        Open the map
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </Link>
  );
}
